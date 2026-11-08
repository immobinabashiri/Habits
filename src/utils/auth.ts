import { hash, compare } from "bcryptjs";

/**
	 * Hashes a plain text password using bcrypt.
	 * @param password - The plain text password to be hashed
	 * @returns The hashed password string
 */

async function hashPassword(password: string) {
	// Hash the password with a salt factor of 12
	const hashedPassword = await hash(password, 12);
	return hashedPassword;
}

/**
	 * Compares a plain text password with a hashed password to check if they match.
	 * @param password - The plain text password provided by the user
	 * @param hashedPassword - The hashed password stored in the database
	 * @returns Boolean indicating if the password is correct
 */

async function verifyPassword(password: string, hashedPassword: string) {
	// Compare the plain password with the stored hashed password
	const isValid = await compare(password, hashedPassword);
	return isValid;
}

export { hashPassword, verifyPassword };