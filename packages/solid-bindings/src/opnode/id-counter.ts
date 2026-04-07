const idCounter = new Map<string, number>();

export function getNextId(elementType: string): string {
  const value = (idCounter.get(elementType) ?? 0) + 1;
  idCounter.set(elementType, value);
  return `${elementType}-${value}`;
}

export function resetIdCounter(): void {
  idCounter.clear();
}
