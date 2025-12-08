import { Common } from './common.js';

export class DeckImporter {

  static async imageToDeck() {
    const templatePath = `modules/mass-import/templates/image-to-deck-dialog.html`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});
    
    const sourceData = { activeSource: 'data', activeBucket: '', path: '' };

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: "Import Folder to Card Deck", icon: "fas fa-cards" },
      content: htmlContent,
      buttons: [
        {
          action: "create",
          label: "Create Deck",
          default: true,
          callback: async (event, button, dialog) => {
            await DeckImporter.processDeck(dialog.element, sourceData);
          }
        },
        { action: "cancel", label: "Cancel" }
      ]
    });

    // 2. Attach Listener explicitly (This fixes the buttons not working)
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;
        Common.bindFilePicker(html, ".picker-button-folder", "input[name='folder-path']", "folder", sourceData);
        Common.bindFilePicker(html, ".picker-button-image", "input[name='card-back-image']", "image", null);
    });

    // 3. Render
    dialog.render(true);
  }

  static async processDeck(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const backImg = html.querySelector("input[name='card-back-image']").value;
    const deckName = html.querySelector("#deck_name").value || "My Deck";
    
    let width = parseInt(html.querySelector("#card_width").value);
    let height = parseInt(html.querySelector("#grid_height").value);
    if (!width) width = undefined;
    if (!height) height = undefined;

    if (!folderPath) return ui.notifications.error("Select a folder path!");

    try {
        const result = await FilePicker.browse(sourceData.activeSource, folderPath, { bucket: sourceData.activeBucket });
        
        const deck = await Cards.create({
            name: deckName,
            type: "deck",
            img: backImg || "icons/svg/card-back.svg",
            width: width,
            height: height
        });

        const cardData = result.files
            .filter(f => Common.isValidImage(f))
            .map(file => {
                const name = Common.splitPath(file);
                return {
                    name: name,
                    type: "base",
                    faces: [{ img: file, name: name }],
                    back: { img: backImg },
                    width: width,
                    height: height,
                    origin: deck.id
                };
            });

        if (cardData.length === 0) return ui.notifications.warn("No images found.");

        await deck.createEmbeddedDocuments("Card", cardData);
        
        deck.sheet.render(true);
        ui.notifications.info(`Created deck "${deckName}" with ${cardData.length} cards.`);

    } catch (e) {
        console.error(e);
        ui.notifications.error("Error creating deck.");
    }
  }
}