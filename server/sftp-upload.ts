import { Client } from "ssh2";
import { readFileSync } from "fs";

/**
 * Read a file from the remote SFTP server as a Buffer.
 */
export function sftpRead(remotePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }
        sftp.readFile(remotePath, (readErr, data) => {
          conn.end();
          if (readErr) reject(readErr);
          else resolve(Buffer.from(data));
        });
      });
    });
    conn.on("error", (e) => { conn.end(); reject(e); });
    conn.connect({
      host: SFTP_HOST, port: SFTP_PORT, username: SFTP_USER,
      privateKey: readFileSync(SFTP_KEY_PATH),
    });
  });
}

// Remote server config
const SFTP_HOST = "100.99.180.68";
const SFTP_PORT = 22;
const SFTP_USER = "dealer-uploader";
const SFTP_KEY_PATH = "/root/.ssh/id_ed25519";

/**
 * Upload a file buffer to a remote SFTP server.
 * Creates the target directory if it doesn't exist.
 */
export function sftpUpload(
  buffer: Buffer,
  remotePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        // Ensure directory exists, then write file
        sftp.mkdir(dir, { mode: "0755" }, (mkdirErr) => {
          // Ignore error if directory already exists
          sftp.writeFile(remotePath, buffer, (writeErr) => {
            conn.end();
            if (writeErr) reject(writeErr);
            else resolve();
          });
        });
      });
    });

    conn.on("error", (err) => {
      conn.end();
      reject(err);
    });

    conn.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      privateKey: readFileSync(SFTP_KEY_PATH),
    });
  });
}

/**
 * Build a folder name from an FFL number.
 * Scheme: first 3 digits + last 5 digits of the FFL license number (digits only).
 * e.g. "5-48-009-07-7D-06170" → "54806170"
 *      "1-05-073-07-8K-009807" → "10509807"
 *      "6-01-001-01-8F-01148" → "60101148"
 *      "1-62-107-01-6E-011545" → "16211545"
 *
 * IMPORTANT: This is the authoritative naming scheme for ALL dealer SFTP folders.
 * Do not change this without updating all existing folders.
 */
export function fflToFolderName(fflNumber: string): string {
  const digitsOnly = fflNumber.replace(/[^0-9]/g, "");
  const first = digitsOnly.slice(0, 3);  // first 3 digits (keep leading zeros)
  const last  = digitsOnly.slice(-5);     // last 5 digits
  return first + last;
}

/**
 * Build a standard file name for a dealer document.
 * Format: {folderSuffix}{type}.{ext}
 * e.g. "16211545FFL.pdf", "54806170SOT.jpg", "10509807TNResaleCert.png"
 *
 * The type comes AFTER the folder suffix (not before).
 * Types: FFL, SOT, ST, TNResaleCert, ResaleCert, TaxUseForm
 */
export function dealerDocFileName(type: "FFL" | "SOT" | "ST" | "TNResaleCert" | "ResaleCert" | "TaxUseForm", fflNumber: string, ext: string): string {
  const folder = fflToFolderName(fflNumber);
  return `${folder}${type}.${ext.replace(/^\./, "")}`;
}

export interface DealerDocumentFiles {
  fflFileData?: string;
  fflFileName?: string;
  sotFileData?: string;
  sotFileName?: string;
  resaleFileData?: string;
  resaleFileName?: string;
  taxFormFileData?: string;
  taxFormFileName?: string;
}

/**
 * Upload dealer documents to 3dprintmanager via SFTP.
 * Files are stored as:
 *   /home/dealer-uploader/dealer-docs/{folderName}/SOT{FFL#}.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/FFL{FFL#}.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/ResaleCert{FFL#}.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/TaxUseForm{FFL#}.pdf
 *
 * folderName = FFL# first 3 + last 5 digits (e.g. 57470004)
 */
/**
 * Upload dealer documents to 3dprintmanager via SFTP.
 * Folder naming: FFL first 3 + last 5 digits (e.g. "16211545")
 * File naming: {type}{suffix}.{ext} (e.g. "FFL16211545.pdf", "SOT06170.jpg")
 */
export async function uploadDealerDocuments(
  fflNumber: string,
  files: DealerDocumentFiles
): Promise<void> {
  const safeFflNumber = fflNumber.replace(/[^a-zA-Z0-9\-]/g, '');
  const folder = fflToFolderName(safeFflNumber);
  const suffix  = folder; // same as fflToFolderName output
  const basePath = `/home/dealer-uploader/dealer-docs/${folder}`;

  const uploads: Promise<void>[] = [];

  if (files.fflFileData && files.fflFileName) {
    const ext = (files.fflFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.fflFileData, "base64"), `${basePath}/${suffix}FFL.${ext}`)
        .catch(err => console.error("sftp_upload_ffl_error", err))
    );
  }
  if (files.sotFileData && files.sotFileName) {
    const ext = (files.sotFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.sotFileData, "base64"), `${basePath}/${suffix}SOT.${ext}`)
        .catch(err => console.error("sftp_upload_sot_error", err))
    );
  }
  if (files.resaleFileData && files.resaleFileName) {
    const ext = (files.resaleFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.resaleFileData, "base64"), `${basePath}/${suffix}ResaleCert.${ext}`)
        .catch(err => console.error("sftp_upload_resale_error", err))
    );
  }
  if (files.taxFormFileData && files.taxFormFileName) {
    const ext = (files.taxFormFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.taxFormFileData, "base64"), `${basePath}/${suffix}TaxUseForm.${ext}`)
        .catch(err => console.error("sftp_upload_taxform_error", err))
    );
  }

  await Promise.all(uploads);
}
