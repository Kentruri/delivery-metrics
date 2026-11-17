import { createInterface } from "node:readline/promises";
import { hashPassword } from "../auth/password.js";

const fromArgument = process.argv[2];
let password = fromArgument;
if (!password) {
  const prompt = createInterface({ input: process.stdin, output: process.stderr });
  password = await prompt.question("Password: ");
  prompt.close();
}
if (!password || password.length < 12) {
  throw new Error("Use a password of at least 12 characters.");
}
console.log(await hashPassword(password));
