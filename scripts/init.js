import { DeckImporter } from './deck-importer.js';
import { JournalImporter } from './journal-importer.js';
import { SceneImporter } from './scene-importer.js';

const MODULE_ID = 'mass-import';

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Mass Import Module`);

  // Define the API object with direct methods
  const api = {
    deck: () => DeckImporter.imageToDeck(),
    journal: () => JournalImporter.imageToJournal(),
    scene: () => SceneImporter.imageToScene(),
    showImporters: () => {
        new foundry.applications.api.DialogV2({
            window: { title: "Mass Import Launcher", icon: "fas fa-file-import" },
            content: "<p>Select the type of content you wish to import:</p>",
            buttons: [
                {
                    action: "scene",
                    label: "Scene Importer",
                    icon: "fas fa-map",
                    callback: () => SceneImporter.imageToScene()
                },
                {
                    action: "journal",
                    label: "Journal Importer",
                    icon: "fas fa-book-open",
                    callback: () => JournalImporter.imageToJournal()
                },
                {
                    action: "deck",
                    label: "Deck Importer",
                    icon: "fas fa-cards",
                    callback: () => DeckImporter.imageToDeck()
                }
            ]
        }).render(true);
    }
  };

  // Expose API via the module registration
  game.modules.get(MODULE_ID).api = api;

  // Expose a global variable for easier access (e.g., MassImport.scene())
  globalThis.MassImport = api;
});