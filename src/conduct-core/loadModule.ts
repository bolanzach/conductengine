export async function loadClientModule<T>(
  modulePath: string
): Promise<T | undefined> {
  try {
    return (await import("../game/" + modulePath)) as T;
  } catch (_) {
    return undefined;
  }
}
