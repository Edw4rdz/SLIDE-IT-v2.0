import fs from 'fs/promises';

/**
 * Scans a file for viruses.
 * Currently implements a check for the EICAR test signature.
 * In a production environment, this should integrate with ClamAV or an external API.
 * 
 * @param {string} filePath - The path to the file to scan.
 * @returns {Promise<boolean>} - Returns true if the file is safe, throws an error if a virus is detected.
 */
export const scanFile = async (filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return scanBuffer(buffer);
  } catch (error) {
    if (error.message.startsWith("Virus detected")) {
      throw error;
    }
    console.error("Error scanning file:", error);
    throw new Error("File scanning failed.");
  }
};

/**
 * Scans a buffer for viruses.
 * @param {Buffer} buffer 
 * @returns {Promise<boolean>}
 */
export const scanBuffer = async (buffer) => {
    const content = buffer.toString();

    // EICAR test string (standard antivirus test file)
    const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

    if (content.includes(EICAR_SIGNATURE)) {
      throw new Error("Virus detected: EICAR test signature found.");
    }

    return true;
};
