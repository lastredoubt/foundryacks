// Import Modules
import { AcksItemSheet } from "./module/item/item-sheet.js"; //verified //
import { AcksActorSheetCharacter } from "./module/actor/character-sheet.js"; //verified //
import { AcksActorSheetMonster } from "./module/actor/monster-sheet.js"; //verified //
import { preloadHandlebarsTemplates } from "./module/preloadTemplates.js"; //verified //
import { AcksActor } from "./module/actor/entity.js"; //verified //
import { AcksItem } from "./module/item/entity.js"; //verified //
import { ACKS } from "./module/config.js";  //verified //
import { registerSettings } from "./module/settings.js"; //verified //
import { registerHelpers } from "./module/helpers.js"; //verified //
import * as chat from "./module/chat.js"; //verified //
import * as treasure from "./module/treasure.js"; //verified //
import * as macros from "./module/macros.js"; //verified //
import * as party from "./module/party.js"; //verified //
import { AcksCombat } from "./module/combat.js"; //verified //

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.debug.hooks = true;
  CONFIG.Combat.initiative = {
    formula: "1d6 + @initiative.value",
    decimals: 0,
  };

  //establishes the object for the acks configuration from config.js as CONFIG.ACKS
  // note, I can't find much documentation on exactly what is in CONFIG, but it is
  //  a run time variable, mutable, with some presets already in place
  // (see the:  CONFIG.debug.hooks = true; command)
  CONFIG.ACKS = ACKS;

  game.acks = {
    rollItemMacro: macros.rollItemMacro,
  };

  // Custom Handlebars helpers
  registerHelpers();

  // Register custom system settings
  registerSettings();

  CONFIG.Actor.documentClass = AcksActor;
  CONFIG.Item.documentClass = AcksItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("acks", AcksActorSheetCharacter, {
    types: ["character"],
    makeDefault: true,
  });
  Actors.registerSheet("acks", AcksActorSheetMonster, {
    types: ["monster"],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("acks", AcksItemSheet, {
    makeDefault: true,
  });

  await preloadHandlebarsTemplates();
});

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function () {
  // Localize CONFIG objects once up-front
  const toLocalize = ["saves_short", "saves_long", "scores", "armor", "colors", "tags"];
  for (let o of toLocalize) {
    CONFIG.ACKS[o] = Object.entries(CONFIG.ACKS[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

Hooks.once("ready", async () => {
  Hooks.on("hotbarDrop", (bar, data, slot) =>
    macros.createAcksMacro(data, slot)
  );
});

// License and KOFI infos
Hooks.on("renderSidebarTab", async (object, html) => {
  if (object instanceof ActorDirectory) {
    party.addControl(object, html);
  }
});

Hooks.on("createCombatant", async (combatant, options, userId) => {
  const init = game.settings.get("acks", "initiative");
  if (init === "group") {
    await AcksCombat.addCombatant(combatant, options, userId);
  }
});

Hooks.on("preUpdateCombatant", AcksCombat.updateCombatant);
Hooks.on("renderCombatTracker", AcksCombat.format);
Hooks.on("preUpdateCombat", AcksCombat.preUpdateCombat);
Hooks.on("getCombatTrackerEntryContext", AcksCombat.addContextEntry);

Hooks.on("renderChatLog", (app, html, data) => AcksItem.chatListeners(html));
Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("renderChatMessage", chat.addChatMessageButtons);
Hooks.on("renderRollTableConfig", treasure.augmentTable);
Hooks.on("updateActor", party.update);