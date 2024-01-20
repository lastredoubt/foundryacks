// called from acks.js for AcksCombat

export class AcksCombat {
  static async rollInitiative(combat, context) {
    // Initialize groups.
    context.combatants = [];
    let groups = {};
    combat.system.combatants.forEach((cbt) => {
      groups[cbt.flags.acks.group] = {present: true};
      context.combatants.push(cbt);
    });

    // Roll initiative for each group.
    for (const group in groups) {
      const roll = new Roll("1d6");
      await roll.evaluate({async: true});
      await roll.toMessage({
        flavor: game.i18n.format('ACKS.roll.initiative', {
          group: CONFIG["ACKS"].colors[group],
        }),
      });

      groups[group].initiative = roll.total;
    }

    // Set the inititative for each group combatant.
    for (const combatant of context.combatants) {
      if (!combatant.actor) {
        return;
      }

      let initiative = groups[combatant.flags.acks.group].initiative;
      if (combatant.actor.system.isSlow) {
        initiative -= 1;
      }

      await combatant.updateSource({
        initiative: initiative,
      });
    }

    combat.setupTurns();
  }

  static async resetInitiative(combat, context) {
    const reroll = game.settings.get("acks", "initiativePersistence");
    if (!["reset", "reroll"].includes(reroll)) {
      return;
    }

    combat.resetAll();
  }

  static async individualInitiative(combat, context) {
    const updates = [];
    const messages = [];

    let index = 0;

    for (const [id, combatant] of combat.system.combatants.entries()) {
      const roll = combatant.getInitiativeRoll();
      await roll.evaluate({async: true});
      let value = roll.total;

      if (combat.settings.skipDefeated && combatant.defeated) {
        value = -790;
      }

      updates.push({
        _id: id,
        initiative: value,
      });

      // Determine the roll mode
      let rollMode = game.settings.get("core", "rollMode");
      if ((combatant.token.hidden || combatant.hidden)
          && (rollMode === "roll")) {
        rollMode = "gmroll";
      }

      // Construct chat message data
      const messageData = mergeObject({
        speaker: {
          scene: canvas.scene._id,
          actor: combatant.actor?.id || null,
          token: combatant.token.id,
          alias: combatant.token.name
        },
        flavor: game.i18n.format('ACKS.roll.individualInit', {
          name: combatant.token.name,
        }),
      }, {});

      const chatData = await roll.toMessage(messageData, {
        rollMode,
        create: false,
      });

      // Only play one sound for the whole set.
      if (index > 0) {
        chatData.sound = null;
      }

      messages.push(chatData);

      ++index;
    }

    await combat.updateEmbeddedDocuments("Combatant", updates);
    await CONFIG.ChatMessage.documentClass.create(messages);

    context.turn = 0;
  }

  static format(object, html, user) {
    html.find(".initiative").each((_, span) => {
      span.innerHTML =
        span.innerHTML == "-789.00"
          ? '<i class="fas fa-weight-hanging"></i>'
          : span.innerHTML;
      span.innerHTML =
        span.innerHTML == "-790.00"
          ? '<i class="fas fa-dizzy"></i>'
          : span.innerHTML;
    });

    html.find(".combatant").each((_, ct) => {
      // Append spellcast and retreat
      const controls = $(ct).find(".combatant-controls .combatant-control");
      const cmbtant = game.combat.combatants.get(ct.dataset.combatantId);
      const moveActive = cmbtant.flags.acks?.moveInCombat ? "active" : "";
      controls.eq(1).after(
        `<a class='combatant-control move-combat ${moveActive}'><i class='fas fa-running'></i></a>`
      );
      const spellActive = cmbtant.flags.acks?.prepareSpell ? "active" : "";
      controls.eq(1).after(
        `<a class='combatant-control prepare-spell ${spellActive}'><i class='fas fa-magic'></i></a>`
      );
      const holdActive = cmbtant.flags.acks?.holdTurn ? "active" : "";
      controls.eq(1).after(
        `<a class='combatant-control hold-turn ${holdActive}'><i class='fas fa-pause-circle'></i></a>`
      );
    });

    AcksCombat.announceListener(html);

    let init = game.settings.get("acks", "initiative") === "group";
    if (!init) {
      return;
    }

    html.find('.combat-control[data-control="rollNPC"]').remove();
    html.find('.combat-control[data-control="rollAll"]').remove();
    let trash = html.find(
      '.encounters .combat-control[data-control="endCombat"]'
    );
    $(
      '<a class="combat-control" data-control="reroll"><i class="fas fa-dice"></i></a>'
    ).insertBefore(trash);

    html.find(".combatant").each((_, ct) => {
      // Can't roll individual inits
      $(ct).find(".roll").remove();

      // Get group color
      const combatant = object.viewed.combatants.get(ct.dataset.combatantId);
      let color = combatant.flags.acks?.group;

      // Append colored flag
      let controls = $(ct).find(".combatant-controls");
      controls.prepend(
        `<a class='combatant-control flag' style='color:${color}' title="${CONFIG.ACKS.colors[color]}"><i class='fas fa-flag'></i></a>`
      );
    });

    AcksCombat.addListeners(html);
  }

  static updateCombatant(combat, combatant, context) {
    let init = game.settings.get("acks", "initiative");
    // Why do you reroll ?
    if (context.initiative && init == "group") {
      let groupInit = context.initiative;
      // Check if there are any members of the group with init
      combat.combatants.forEach((ct) => {
        if (
          ct.initiative &&
          ct.initiative != "-789.00" &&
          ct._id != context._id &&
          ct.flags.acks.group == combatant.flags.acks.group
        ) {
          groupInit = ct.initiative;
          // Set init
          context.initiative = parseInt(groupInit);
        }
      });
    }
  }

  static announceListener(html) {
    html.find(".combatant-control.hold-turn").click(async (event) => {
      event.preventDefault();

      // Toggle hold announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains('active');
      const combatant = game.combat.combatants.get(id);
      await combatant.updateSource({
        _id: id,
        flags: {
          acks: {
            holdTurn: !isActive,
          },
        },
      });
    })

    html.find(".combatant-control.prepare-spell").click(async (event) => {
      event.preventDefault();

      // Toggle spell announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains('active');
      const combatant = game.combat.combatants.get(id);
      await combatant.updateSource({
        _id: id,
        flags: {
          acks: {
            prepareSpell: !isActive,
          },
        },
      });
    });

    html.find(".combatant-control.move-combat").click(async (event) => {
      event.preventDefault();

      // Toggle retreat announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains('active');
      const combatant = game.combat.combatants.get(id);
      await combatant.updateSource({
        _id: id,
        flags: {
          acks: {
            moveInCombat: !isActive,
          },
        },
      });
    });
  }

  static addListeners(html) {
    // Cycle through colors
    html.find(".combatant-control.flag").click(async (event) => {
      event.preventDefault();

      if (!game.user.isGM) {
        return;
      }

      const currentColor = event.currentTarget.style.color;
      const colors = Object.keys(CONFIG.ACKS.colors);
      let index = colors.indexOf(currentColor);
      if (index + 1 == colors.length) {
        index = 0;
      } else {
        index++;
      }

      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const combatant = game.combat.combatants.get(id);
      await combatant.updateSource({
        _id: id,
        flags: {
          acks: {
            group: colors[index],
          },
        },
      });
    });

    html.find('.combat-control[data-control="reroll"]').click(async (event) => {
      event.preventDefault();

      if (!game.combat) {
        return;
      }

      const context = {};
      AcksCombat.rollInitiative(game.combat, context);

      await game.combat.updateSource({
        system: context,
      })

      game.combat.setupTurns();
    });
  }

  static async addCombatant(combatant, options, userId) {
    let color = "black";
    switch (combatant.token.disposition) {
      case -1:
        color = "red";
        break;
      case 0:
        color = "yellow";
        break;
      case 1:
        color = "green";
        break;
    }

    await combatant.updateSource({
      flags: {
        acks: {
          group: color,
        },
      },
    });
  }

  static activateCombatant(li) {
    const turn = game.combat.turns.findIndex(turn => turn._id === li.data('combatant-id'));
    game.combat.updateSource({turn: turn})
  }

  static addContextEntry(html, options) {
    options.unshift({
      name: "Set Active",
      icon: '<i class="fas fa-star-of-life"></i>',
      callback: AcksCombat.activateCombatant
    });
  }

  static async preUpdateCombat(combat, context, diff, id) {
    if (!context.round) {
      return;
    }

    if (context.round !== 1) {
      const reroll = game.settings.get("acks", "initiativePersistence");

      if (reroll === "reset") {
        AcksCombat.resetInitiative(combat, context, diff, id);
        return;
      } else if (reroll === "keep") {
        return;
      }
    }

    const init = game.settings.get("acks", "initiative");

    if (init === "group") {
      AcksCombat.rollInitiative(combat, context, diff, id);
    } else if (init === "individual") {
      AcksCombat.individualInitiative(combat, context, diff, id);
    }
  }
}