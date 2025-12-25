/**
 * Utility for validating entity names across Avatars and Products.
 * Ensures that Avatar and Product names are unique to avoid conflicts
 * when using @ mention syntax for both entity types.
 */

export interface NameValidationResult {
    taken: boolean;
    takenBy: 'avatar' | 'product' | null;
    message: string | null;
}

/**
 * Check if a name is already taken by another entity type.
 * This is used during Avatar/Product creation to prevent name conflicts.
 * 
 * @param name - The name to validate
 * @param entityType - The type of entity being created ('avatar' or 'product')
 * @param avatarNames - List of existing avatar names
 * @param productNames - List of existing product names
 * @returns Validation result including whether the name is taken and by which entity type
 */
export function isNameTakenByOtherEntity(
    name: string,
    entityType: 'avatar' | 'product',
    avatarNames: string[],
    productNames: string[]
): NameValidationResult {
    const lowerName = name.toLowerCase().trim();

    if (!lowerName) {
        return { taken: false, takenBy: null, message: null };
    }

    if (entityType === 'avatar') {
        // Check if a product already has this name
        if (productNames.some(n => n.toLowerCase() === lowerName)) {
            return {
                taken: true,
                takenBy: 'product',
                message: `A product with the name "${name}" already exists. Please choose a different name.`,
            };
        }
    } else {
        // Check if an avatar already has this name
        if (avatarNames.some(n => n.toLowerCase() === lowerName)) {
            return {
                taken: true,
                takenBy: 'avatar',
                message: `An avatar with the name "${name}" already exists. Please choose a different name.`,
            };
        }
    }

    return { taken: false, takenBy: null, message: null };
}

/**
 * Check if a name is taken by any entity (avatar or product).
 * Useful for checking if a name can be used at all.
 * 
 * @param name - The name to check
 * @param avatarNames - List of existing avatar names
 * @param productNames - List of existing product names
 * @returns Object with taken status and which entity type has the name
 */
export function isNameTaken(
    name: string,
    avatarNames: string[],
    productNames: string[]
): { taken: boolean; takenBy: 'avatar' | 'product' | null } {
    const lowerName = name.toLowerCase().trim();

    if (!lowerName) {
        return { taken: false, takenBy: null };
    }

    if (avatarNames.some(n => n.toLowerCase() === lowerName)) {
        return { taken: true, takenBy: 'avatar' };
    }

    if (productNames.some(n => n.toLowerCase() === lowerName)) {
        return { taken: true, takenBy: 'product' };
    }

    return { taken: false, takenBy: null };
}
