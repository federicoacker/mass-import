import { Common } from './common.js';

export class SceneImporter {

  static async imageToScene() {
    const templatePath = `modules/mass-import/templates/image-to-scene-dialog.html`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});

    const sourceData = {
      activeSource: 'data',
      activeBucket: '',
      path: ''
    };

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: "Import Images to Scenes", icon: "fas fa-map" },
      content: htmlContent,
      buttons: [
        {
          action: "create",
          label: "Create Scenes",
          icon: "fas fa-check",
          default: true,
          callback: async (event, button, dialog) => {
             const html = dialog.element;
             await SceneImporter.processImport(html, sourceData);
          }
        },
        { action: "cancel", label: "Cancel", icon: "fas fa-times" }
      ]
    });

    // 2. Attach Listener explicitly
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;
        // Bind FilePicker
        Common.bindFilePicker(html, ".picker-button", "input[name='folder-path']", "folder", sourceData);
        
        const range = html.querySelector("#grid_alpha");
        const rangeOut = html.querySelector(".range-value");
        if(range && rangeOut) range.addEventListener('input', e => rangeOut.textContent = e.target.value);
    });

    // 3. Render
    dialog.render(true);
  }

  static async processImport(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const folderName = html.querySelector("#folderName").value || "Imported Scenes";

    if (!folderPath) {
      ui.notifications.error("Mass Import: Please select a folder path.");
      return;
    }

    try {
      let folder = game.folders.find(f => f.name === folderName && f.type === "Scene");
      if (!folder) {
        folder = await Folder.create({ name: folderName, type: "Scene" });
      }

      const browseOptions = { bucket: sourceData.activeBucket || '' };
      const filesResult = await FilePicker.browse(sourceData.activeSource, folderPath, browseOptions);
      
      if (!filesResult.files || filesResult.files.length === 0) {
        ui.notifications.warn("Mass Import: No files found in the selected folder.");
        return;
      }

      const defaults = {
        folder: folder.id,
        grid: {
            type: parseInt(html.querySelector("select[name='select_grid_type']").value),
            alpha: parseFloat(html.querySelector("#grid_alpha").value),
            distance: parseFloat(html.querySelector("#grid_distance").value),
            units: html.querySelector("#grid_units").value,
            size: parseInt(html.querySelector("#grid_size").value)
        },
        navigation: html.querySelector("input[name='select_navigation']").checked,
        backgroundColor: html.querySelector("#background_color").value,
        tokenVision: html.querySelector("input[name='token_vision']").checked,
        fogExploration: html.querySelector("input[name='fog_exploration']").checked
      };

      ui.notifications.info(`Mass Import: Starting import of ${filesResult.files.length} scenes...`);

      let count = 0;
      for (const filePath of filesResult.files) {
        if (!Common.isValidImage(filePath)) continue; 
        
        await SceneImporter.createScene(filePath, defaults);
        count++;
      }

      ui.notifications.info(`Mass Import: Successfully created ${count} scenes.`);

    } catch (err) {
      console.error(err);
      ui.notifications.error("Mass Import: An error occurred. Check console (F12).");
    }
  }

  static async createScene(imagePath, defaults) {
    const tex = await loadTexture(imagePath);
    const width = tex.width;
    const height = tex.height;

    const sceneData = {
      name: Common.splitPath(imagePath),
      width: width,
      height: height,
      background: { src: imagePath },
      grid: { ...defaults.grid },
      padding: 0.25,
      folder: defaults.folder,
      fog: { exploration: defaults.fogExploration },
      tokenVision: defaults.tokenVision,
      backgroundColor: defaults.backgroundColor,
      navigation: defaults.navigation
    };

    return await Scene.create(sceneData);
  }
}