export default async function loadModule<T>(modulePath: string) {
  try {
    return (await import(modulePath)) as T;
  } catch (_) {
    return undefined;
  }
}
