import { greet } from './greet';

export function shout(name) {
  return greet(name).toUpperCase();
}
