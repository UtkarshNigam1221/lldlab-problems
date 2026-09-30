import { greet } from '../greet';

test('greets by name', () => assertEqual(greet('Ada'), 'Hello, Ada!'));
