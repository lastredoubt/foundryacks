// from acks.js for all classes

export const augmentTable = (table, html, context) => {
  // Treasure Toggle
  let head = html.find(".sheet-header");
  const flag = table.object.getFlag("acks", "treasure");
  const treasure = flag
    ? "<div class='toggle-treasure active'></div>"
    : "<div class='toggle-treasure'></div>";
  head.append(treasure);

  html.find(".toggle-treasure").click((ev) => {
    let isTreasure = table.object.getFlag("acks", "treasure");
    table.object.setFlag("acks", "treasure", !isTreasure);
  });

  // Treasure table formatting
  if (flag) {
    // Remove Interval
    html.find(".result-range").remove();
    html.find(".normalize-results").remove();

    html.find(".result-weight").first().text("Chance");

    // Replace Roll button
    const roll = `<button class="roll-treasure" type="button"><i class="fas fa-gem"></i> ${game.i18n.localize('ACKS.table.treasure.roll')}</button>`;
    html.find(".sheet-footer .roll").replaceWith(roll);
  }

  html.find(".roll-treasure").click(async (event) => {
    await rollTreasure(table.object, { event: event });
  });
};

async function drawTreasure(table, context) {
  context.treasure = {};
  if (table.getFlag('acks', 'treasure')) {
    for (const result of table.results) {
      const roll = new Roll("1d100");
      await roll.evaluate({async: true});

      if (roll.total <= result.system.weight) {
        const text = result.getChatText();
        context.treasure[result.id] = ({
          img: result.img,
          text: await TextEditor.enrichHTML(text),
        });

        if ((result.type === CONST.TABLE_RESULT_TYPES.DOCUMENT)
            && (result.collection === "RollTable")) {
          const embeddedTable = game.tables.get(result.resultId);
          drawTreasure(embeddedTable, context.treasure[result.id]);
        }
      }
    }
  } else {
    const results = await table.roll().results;
    results.forEach(async (result) => {
      const text = await TextEditor.enrichHTML(result.getChatText());
      context.treasure[result.id] = {img: result.img, text: text};
    });
  }

  return context;
}

async function rollTreasure(table, options = {}) {
  // Draw treasure
  const context = await drawTreasure(table, {});
  let templateData = {
    treasure: context.treasure,
    table: table,
  };

  // Animation
  if (options.event) {
    let results = $(options.event.currentTarget.parentElement)
      .prev()
      .find(".table-result");
    results.each((_, item) => {
      item.classList.remove("active");
      if (context.treasure[item.dataset.resultId]) {
        item.classList.add("active");
      }
    });
  }

  let html = await renderTemplate(
    "systems/acks/templates/chat/roll-treasure.html",
    templateData,
  );

  let chatData = {
    content: html,
    // sound: "/systems/acks/assets/coins.mp3"
  }

  let rollMode = game.settings.get("core", "rollMode");
  if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
  if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
  if (rollMode === "blindroll") chatData["blind"] = true;

  ChatMessage.create(chatData);
}
