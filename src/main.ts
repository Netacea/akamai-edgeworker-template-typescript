const WORLD = 'World';

export function hello(world: string = WORLD): string {
  return `Hello ${world}!`;
}