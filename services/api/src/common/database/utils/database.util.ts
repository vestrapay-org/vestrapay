import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Database utility service providing common database operations.
 *
 * This injectable service provides utility methods for database-related operations,
 * including ID generation using UUID v4 format. The generated IDs are
 * compatible with PostgreSQL UUID columns and provide unique identifiers
 * for database records.
 *
 * @class DatabaseUtil
 * @injectable
 */
@Injectable()
export class DatabaseUtil {
    /**
     * Checks if the provided ID string is a valid UUID.
     *
     * Uses a regular expression to determine if the given string
     * conforms to the UUID v4 format.
     *
     * @param {string} id - The ID string to validate
     * @returns {boolean} True if the ID is a valid UUID, false otherwise
     */
    checkIdIsValid(id: string): boolean {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    /**
     * Creates a new unique identifier using UUID v4.
     *
     * Generates a new UUID v4 string using Node.js crypto module,
     * making it suitable for use as primary keys in PostgreSQL database records.
     *
     * @returns {string} A UUID v4 string
     */
    createId(): string {
        return randomUUID();
    }

    /**
     * Converts the provided data to a plain object compatible with Prisma JsonObject format.
     *
     * Performs a deep clone of the input and casts it to Prisma.JsonObject, ensuring
     * compatibility for Prisma JSON fields.
     *
     * @template T Input data type
     * @template N Output type, defaults to Prisma.JsonObject
     * @param {T} data - The data to convert
     * @returns {N} The plain object representation, compatible with Prisma JsonObject
     */
    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    /**
     * Converts the provided data to a plain array compatible with Prisma JsonObject array format.
     *
     * Performs a deep clone of the input and casts it to an array of Prisma.JsonObject,
     * making it suitable for Prisma JSON array fields.
     *
     * @template T Input data type
     * @template N Output array element type, defaults to Prisma.JsonObject
     * @param {T} data - The data to convert
     * @returns {N[]} The plain array representation, compatible with Prisma JsonObject[]
     */
    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
