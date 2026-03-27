use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use thiserror::Error;

use crate::LogEntry;

#[derive(Debug, Error)]
pub enum WalError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Failed to deserialize record: {0}")]
    Deserialize(#[from] bincode::Error),

    #[error("CRC mismatch: expected {expected:#010x}, got {actual:#010x}")]
    ChecksumMismatch { expected: u32, actual: u32 },

    #[error("Record too large: {size} bytes (max {max})")]
    RecordTooLarge { size: u32, max: u32 },
}

/// Maximum allowed record payload size (16 MB).
/// Prevents a corrupted length field from causing huge allocations.
const MAX_RECORD_SIZE: u32 = 16 * 1024 * 1024;

/// A framed WAL record as it appears on disk.
///
/// On-disk layout (all values little-endian):
///   [ payload_len: u32 | crc32: u32 | payload: [u8; payload_len] ]
///
/// - payload_len: byte length of the serialized LogEntry
/// - crc32: checksum of the payload bytes (for corruption detection)
/// - payload: bincode-serialized LogEntry
pub struct WalRecord;

impl WalRecord {
    /// Serialize a LogEntry into a framed on-disk record (bytes).
    pub fn encode(entry: &LogEntry) -> Result<Vec<u8>, WalError> {
        let payload = bincode::serialize(entry)?;
        let payload_len = payload.len() as u32;

        let crc = crc32fast::hash(&payload);

        let mut record = Vec::with_capacity(4 + 4 + payload.len());
        record.extend_from_slice(&payload_len.to_le_bytes());
        record.extend_from_slice(&crc.to_le_bytes());
        record.extend_from_slice(&payload);

        Ok(record)
    }

    /// Deserialize a LogEntry from raw bytes (length + crc + payload).
    /// Returns the LogEntry and the total number of bytes consumed.
    pub fn decode(data: &[u8]) -> Result<(LogEntry, usize), WalError> {
        if data.len() < 8 {
            return Err(WalError::Io(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                "not enough data for record header",
            )));
        }

        let payload_len = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        let expected_crc = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);

        if payload_len > MAX_RECORD_SIZE {
            return Err(WalError::RecordTooLarge {
                size: payload_len,
                max: MAX_RECORD_SIZE,
            });
        }

        let total_size = 8 + payload_len as usize;
        if data.len() < total_size {
            return Err(WalError::Io(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                "not enough data for record payload",
            )));
        }

        let payload = &data[8..total_size];

        let actual_crc = crc32fast::hash(payload);
        if actual_crc != expected_crc {
            return Err(WalError::ChecksumMismatch {
                expected: expected_crc,
                actual: actual_crc,
            });
        }

        let entry: LogEntry = bincode::deserialize(payload)?;

        Ok((entry, total_size))
    }
}

/// Appends LogEntry records to a WAL file on disk.
///
/// Each call to `append` encodes the entry as a framed record and writes it
/// to the file, then flushes to ensure durability.
pub struct WalWriter {
    file: File,
    path: PathBuf,
}

impl WalWriter {
    /// Open (or create) a WAL file for appending.
    pub fn open(path: &Path) -> Result<Self, WalError> {
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;

        Ok(WalWriter {
            file,
            path: path.to_path_buf(),
        })
    }

    /// Encode and append a single LogEntry to the WAL file.
    pub fn append(&mut self, entry: &LogEntry) -> Result<(), WalError> {
        let record_bytes = WalRecord::encode(entry)?;
        self.file.write_all(&record_bytes)?;
        self.file.flush()?;
        Ok(())
    }

    /// Returns the path of the WAL file.
    pub fn path(&self) -> &Path {
        &self.path
    }
}

/// Reads all LogEntry records from a WAL file.
///
/// Loads the entire file into memory and decodes records sequentially.
pub struct WalReader;

impl WalReader {
    /// Read all entries from a WAL file on disk.
    pub fn read_all(path: &Path) -> Result<Vec<LogEntry>, WalError> {
        let data = std::fs::read(path)?;
        let mut entries = Vec::new();
        let mut offset = 0;

        while offset < data.len() {
            let (entry, consumed) = WalRecord::decode(&data[offset..])?;
            entries.push(entry);
            offset += consumed;
        }

        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::EntityId;

    #[test]
    fn tick_start() {
        let entry = LogEntry::TickStart { tick: 42 };
        let bytes = WalRecord::encode(&entry).unwrap();
        let (decoded, consumed) = WalRecord::decode(&bytes).unwrap();
        assert_eq!(entry, decoded);
        assert_eq!(consumed, bytes.len());
    }

    #[test]
    fn component_added() {
        let entry = LogEntry::ComponentAdded {
            entity_id: EntityId::new_v4(),
            component_type: "Position".to_string(),
            data: vec![1, 2, 3, 4],
        };
        let bytes = WalRecord::encode(&entry).unwrap();
        let (decoded, _) = WalRecord::decode(&bytes).unwrap();
        assert_eq!(entry, decoded);
    }

    #[test]
    fn detects_corruption() {
        let entry = LogEntry::TickEnd { tick: 1 };
        let mut bytes = WalRecord::encode(&entry).unwrap();
        let last = bytes.len() - 1;
        bytes[last] ^= 0xFF;
        let result = WalRecord::decode(&bytes);
        assert!(matches!(result, Err(WalError::ChecksumMismatch { .. })));
    }

    #[test]
    fn write_and_read_back() {
        let dir = tempfile::tempdir().unwrap();
        let wal_path = dir.path().join("test.wal");

        let entries = vec![
            LogEntry::TickStart { tick: 1 },
            LogEntry::EntityCreated {
                entity_id: EntityId::new_v4(),
            },
            LogEntry::TickEnd { tick: 1 },
        ];

        let mut writer = WalWriter::open(&wal_path).unwrap();
        for entry in &entries {
            writer.append(entry).unwrap();
        }

        let read_back = WalReader::read_all(&wal_path).unwrap();
        assert_eq!(entries, read_back);
    }

    #[test]
    fn read_empty_file() {
        let dir = tempfile::tempdir().unwrap();
        let wal_path = dir.path().join("empty.wal");
        File::create(&wal_path).unwrap();

        let entries = WalReader::read_all(&wal_path).unwrap();
        assert!(entries.is_empty());
    }
}