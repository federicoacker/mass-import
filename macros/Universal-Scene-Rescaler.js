/**
 * Universal Scene Rescaler
 * ----------------------------------------------------
 * Description: Batch updates the Grid Distance, Grid Units, 
 * Light radius, and Sound radius for the current scene.
 * It applies the selected operation (Multiply/Divide) to the
 * grid distance as well.
 * Icon: icons/tools/navigation/map-plain-green.webp
 */

const MACRO_VERSION = '1.0';

main();

async function main() {
  // Check if a scene is currently viewed to prevent errors
  if (!canvas.scene) {
    ui.notifications.warn("No scene is currently being viewed.");
    return;
  }

  // Render the configuration dialog
  new Dialog({
    title: `Universal Scene Rescaler v${MACRO_VERSION}`,
    content: getDialogContent(),
    buttons: {
      update: {
        icon: '<i class="fas fa-check"></i>',
        label: "Update Scene",
        callback: (html) => executeUpdate(html)
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "update"
  }).render(true);
}

/**
 * Generates the HTML content for the dialog using standard Foundry v13 form classes.
 */
function getDialogContent() {
  return `
    <form class="standard-form">
      <div style="text-align:center; margin-bottom: 10px; border: 1px solid red; padding: 5px; border-radius: 5px; background-color: rgba(255, 0, 0, 0.1);">
        <i class="fas fa-skull-crossbones" style="color:red; margin-right:5px;"></i>
        <b style="color:red;">WARNING: THIS ACTION CANNOT BE UNDONE!</b>
      </div>
      <p style="font-size: 0.9em; text-align: center;">This will modify Grid Distance, Lights, and Sounds.</p>
      <hr>

      <div class="form-group">
        <label>Operation</label>
        <div class="form-fields">
          <select id="operation">
            <option value="divide">Divide ( / )</option>
            <option value="multiply">Multiply ( * )</option>
          </select>
        </div>
        <p class="notes">Select whether to divide or multiply the current values.</p>
      </div>

      <div class="form-group">
        <label>Factor Value</label>
        <div class="form-fields">
          <input type="number" id="factor" value="5" min="0.1" max="100" step="0.1" />
        </div>
        <p class="notes">The number used to scale Grid, Lights, and Sounds.</p>
      </div>

      <div class="form-group">
        <label>New Grid Unit Name</label>
        <div class="form-fields">
          <input type="text" id="newUnit" value="m" placeholder="e.g., m, ft, in" />
        </div>
        <p class="notes">Sets the new label for the grid unit (e.g., changing 'ft' to 'm').</p>
      </div>
    </form>
  `;
}

/**
 * Processes the user input and performs batch updates on scene documents.
 * @param {jQuery} html - The jQuery object representing the dialog content.
 */
async function executeUpdate(html) {
  // Extract values from inputs
  const operation = html.find("#operation").val();
  const factor = parseFloat(html.find("#factor").val());
  const newGridUnit = html.find("#newUnit").val();

  // Validate inputs
  if (!factor || factor <= 0) {
    ui.notifications.error("Invalid Factor value.");
    return;
  }

  const currentScene = canvas.scene;

  /**
   * Helper function to calculate value based on operation
   * @param {number} value - The original value
   * @returns {number} The calculated value
   */
  const calculate = (value) => {
    let result = 0;
    if (operation === "multiply") {
      result = value * factor;
    } else {
      result = value / factor;
    }
    // Round to 2 decimal places to avoid floating point errors
    return Math.round(result * 100) / 100;
  };

  // 1. Prepare updates for Ambient Lights
  const lightUpdates = currentScene.lights.map(light => {
    const config = light.config;
    return {
      _id: light.id,
      config: {
        bright: calculate(config.bright),
        dim: calculate(config.dim)
      }
    };
  });

  // 2. Prepare updates for Ambient Sounds
  const soundUpdates = currentScene.sounds.map(sound => {
    return {
      _id: sound.id,
      radius: calculate(sound.radius)
    };
  });

  // 3. Calculate New Grid Distance
  const currentGridDist = currentScene.grid.distance;
  const newGridDist = calculate(currentGridDist);

  // 4. Execute Database Updates
  try {
    if (lightUpdates.length > 0) {
      await currentScene.updateEmbeddedDocuments("AmbientLight", lightUpdates);
    }
    
    if (soundUpdates.length > 0) {
      await currentScene.updateEmbeddedDocuments("AmbientSound", soundUpdates);
    }

    // Update Scene Grid Settings
    await currentScene.update({
      "grid.distance": newGridDist,
      "grid.units": newGridUnit
    });

    ui.notifications.info(`Scene rescaled (${operation} by ${factor}). Grid Distance changed from ${currentGridDist} to ${newGridDist}.`);

  } catch (error) {
    console.error("Universal Scene Rescaler Error:", error);
    ui.notifications.error("An error occurred while updating the scene. Check console for details.");
  }
}