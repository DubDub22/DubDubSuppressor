import { Client } from "ssh2";
import { readFileSync } from "fs";

// Remote server config
const SFTP_HOST = "100.99.180.68";
const SFTP_PORT = 22;
const SFTP_USER = "dealer-uploader";
const SFTP_KEY_PATH = "/home/dubdub/.ssh/id_ed25519_sftp";

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
        sftp.mkdir(dir, { mode: "0755" }, (mkdirErr) => {
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
 * Convert an FFL license number to a folder name.
 * Format: {zone}_{ray}_{series}_{type}_{seq} with letters uppercased
 * e.g. "1_54_047_07_9B_26933"
 * Input variants: "1-54-047-07-9B-26933", "000001-54-047-07-9B-26933", "1_54_047_07_9B_26933"
 */
export function fflToFolderName(fflNumber: string): string {
  const cleaned = fflNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 14) {
    const zone   = cleaned.slice(0, 1);
    const ray    = cleaned.slice(1, 3);
    const series = cleaned.slice(3, 6);
    const type   = cleaned.slice(6, 8);
    const seq    = cleaned.slice(8);  // e.g. '8H09528'
    const seqLetters = seq.slice(0, 2);  // '8H'
    const seqDigits  = seq.slice(2);     // '09528'
    return zone + "_" + ray + "_" + series + "_" + type + "_" + seqLetters + "_" + seqDigits;
  }
  return fflNumber.replace(/[\s\-]+/g, "_").toUpperCase();
}

/**
 * Build a standard file name for a dealer document.
 * Format: {type}.{ext} — no folder prefix in file name.
 * e.g. "FFL.pdf", "SOT.jpg", "StateTax.png"
 */
export function dealerDocFileName(type: string, ext: string): string {
  return type + "." + ext.replace(/^\./, "");
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
 * Folder naming: fflToFolderName(FFL#) e.g. "1_54_047_07_9B_26933"
 * File naming: {type}.{ext} (e.g. "FFL.pdf", "SOT.jpg")
 *
 * File types stored as:
 *   /home/dealer-uploader/dealer-docs/{folderName}/FFL.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/SOT.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/StateTax.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/MultiTax.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/ResaleCert.pdf
 *   /home/dealer-uploader/dealer-docs/{folderName}/TNResaleCert.png
 *   /home/dealer-uploader/dealer-docs/{folderName}/LOA.pdf
 */
export async function uploadDealerDocuments(
  fflNumber: string,
  files: DealerDocumentFiles
): Promise<void> {
  const safeFflNumber = fflNumber.replace(/[^a-zA-Z0-9\-]/g, "");
  const folder = fflToFolderName(safeFflNumber);
  const basePath = "/home/dealer-uploader/dealer-docs/" + folder;

  const uploads: Promise<void>[] = [];

  if (files.fflFileData && files.fflFileName) {
    const ext = (files.fflFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.fflFileData, "base64"), basePath + "/FFL." + ext)
        .catch(err => console.error("sftp_upload_ffl_error", err))
    );
  }
  if (files.sotFileData && files.sotFileName) {
    const ext = (files.sotFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.sotFileData, "base64"), basePath + "/SOT." + ext)
        .catch(err => console.error("sftp_upload_sot_error", err))
    );
  }
  if (files.resaleFileData && files.resaleFileName) {
    const ext = (files.resaleFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.resaleFileData, "base64"), basePath + "/StateTax." + ext)
        .catch(err => console.error("sftp_upload_resale_error", err))
    );
  }
  if (files.taxFormFileData && files.taxFormFileName) {
    const ext = (files.taxFormFileName.split(".").pop() || "pdf").toLowerCase();
    uploads.push(
      sftpUpload(Buffer.from(files.taxFormFileData, "base64"), basePath + "/StateTax." + ext)
        .catch(err => console.error("sftp_upload_taxform_error", err))
    );
  }

  await Promise.all(uploads);
}
