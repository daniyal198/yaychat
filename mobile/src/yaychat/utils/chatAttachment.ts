/**
 * The picker is resolved at call time rather than imported at module scope.
 *
 * It is a native module: importing it eagerly throws
 * `TurboModuleRegistry.getEnforcing('RNDocumentPicker')` anywhere the native
 * side is absent — the test runner, and any build that has not been rebuilt
 * since the dependency was added. That takes down every screen that merely
 * imports this file, rather than only the code path that actually picks.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const picker = () => require('@react-native-documents/picker');

/**
 * Picking a real file to send in a chat.
 *
 * Mirrors `profilePhoto.ts`: the picked file is copied into the app's own
 * directory before anything else touches it. A picker URI can be a scoped,
 * one-shot handle that stops resolving once the picker closes, so uploading
 * straight from it fails intermittently and only on some devices.
 */

export type AttachmentKind = 'image' | 'video' | 'file';

export interface PickedAttachment {
  /** App-local copy, safe to read after the picker has closed. */
  uri: string;
  name: string;
  /** MIME type, used for both the presigned upload and the stored fileType. */
  mimeType: string;
  size: number | null;
}

/**
 * Size ceiling.
 *
 * The upload is a single PUT held in memory as a blob, so this is a real
 * constraint rather than a policy choice — a phone will not hold a 200 MB
 * video in memory to send it.
 */
const MAX_BYTES: Record<AttachmentKind, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  file: 25 * 1024 * 1024,
};

const MAX_LABEL: Record<AttachmentKind, string> = {
  image: '10 MB',
  video: '50 MB',
  file: '25 MB',
};

/** `1.2 MB`, `840 KB` — what the bubble shows under the file name. */
export const formatSize = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fallbackMime: Record<AttachmentKind, string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  file: 'application/octet-stream',
};

/**
 * Open the picker and return an app-local copy, or null if the user cancelled.
 *
 * Cancelling is not an error — it is the most common way this function ends,
 * and surfacing it as one would put a toast on screen every time somebody
 * changes their mind.
 */
export const chooseChatAttachment = async (
  kind: AttachmentKind,
): Promise<PickedAttachment | null> => {
  const {errorCodes, isErrorWithCode, keepLocalCopy, pick, types} = picker();
  const pickerType: Record<AttachmentKind, string> = {
    image: types.images,
    video: types.video,
    file: types.allFiles,
  };
  try {
    const [file] = await pick({
      type: [pickerType[kind]],
      allowMultiSelection: false,
    });

    const size = typeof file.size === 'number' ? file.size : null;
    if (size && size > MAX_BYTES[kind]) {
      throw new Error(`That ${kind} is too large. The limit is ${MAX_LABEL[kind]}.`);
    }

    const name = file.name || `${kind}-${Date.now()}`;
    const [copy] = await keepLocalCopy({
      files: [{uri: file.uri, fileName: name}],
      destination: 'documentDirectory',
    });
    if (copy.status === 'error') {
      throw new Error('That file could not be opened. Please choose another.');
    }

    return {
      uri: copy.localUri,
      name,
      mimeType: file.type || fallbackMime[kind],
      size,
    };
  } catch (error) {
    // The lazy require gives up the package's type guard, so the narrowing is
    // done by hand rather than pretending `error` is typed.
    const code = (error as {code?: string} | null)?.code;
    if (isErrorWithCode(error) && code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
};
