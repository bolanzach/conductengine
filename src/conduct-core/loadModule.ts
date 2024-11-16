export async function loadClientModule<T>(modulePath: string) {
  try {
    return (await import("../game/" + modulePath)) as T;
  } catch (_) {
    return undefined;
  }
}
