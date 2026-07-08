import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Abstraction de stockage pour les pièces jointes de consultation. Le provider
// courant (filesystem local) est temporaire et NON conforme HDS — le CLAUDE.md
// du projet impose des exigences RGPD/HDS fortes pour les données de santé, et
// un simple disque local ne les satisfait pas. À remplacer par un hébergeur de
// données de santé certifié avant tout déploiement avec de vraies pièces
// jointes patients ; le reste de l'application (routes API, base de données,
// éditeur) n'a pas besoin de changer, seule cette implémentation doit l'être.
export interface AttachmentStorage {
  save(input: { buffer: Buffer }): Promise<{ storageKey: string }>;
  read(storageKey: string): Promise<Buffer | null>;
  delete(storageKey: string): Promise<void>;
}

const STORAGE_DIR = path.join(process.cwd(), ".attachments");

// Clé opaque (uuid, sans extension) : évite qu'un fichier renommé/déplacé soit
// jamais servi comme exécutable par un serveur statique mal configuré. Le nom
// de fichier d'origine et le type MIME restent en base (consultation_attachments),
// jamais dans le nom du fichier sur disque.
class LocalFilesystemAttachmentStorage implements AttachmentStorage {
  private async ensureDir() {
    await mkdir(STORAGE_DIR, { recursive: true });
  }

  async save(input: { buffer: Buffer }): Promise<{ storageKey: string }> {
    await this.ensureDir();
    const storageKey = crypto.randomUUID();
    await writeFile(path.join(STORAGE_DIR, storageKey), input.buffer);
    return { storageKey };
  }

  async read(storageKey: string): Promise<Buffer | null> {
    try {
      return await readFile(path.join(STORAGE_DIR, storageKey));
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(path.join(STORAGE_DIR, storageKey)).catch(() => undefined);
  }
}

export const attachmentStorage: AttachmentStorage = new LocalFilesystemAttachmentStorage();
