// called by item/entity.js for AcksDice
// called by actor/entity.js for AcksDice

export class AcksDice {
  static digestResult(context, roll) {
    let result = {
      isSuccess: false,
      isFailure: false,
      target: context.roll.target,
      total: roll.total,
    };

    let die = roll.terms[0].total;
    if (context.roll.type == "above") {
      // SAVING THROWS
      if (roll.total >= result.target) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (context.roll.type == "below") {
      // ?
      if (roll.total <= result.target) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (context.roll.type == "check") {
      // SCORE CHECKS (1s and 20s), EXPLORATION
      if (die == 1 || (roll.total <= result.target && die < 20)) {
        result.isSuccess = true;
      } else {
        result.isFailure = true;
      }
    } else if (context.roll.type == "hitdice") {
      // RESULT CAN BE NO LOWER THAN 1
      if (roll.total < 1) {
        roll._total = 1;
      }
    } else if (context.roll.type == "table") {
      // Reaction, MORALE
      // Roll cannot be less than 2 on a 2d6 roll
      if (roll.total < 2) {
        roll._total = 2
      }
      let table = context.roll.table;
      let output = "";
      for (let i = 0; i <= roll.total; i++) {
        if (table[i]) {
          output = table[i];
        }
      }
      result.details = output;
    }
    return result;
  }

  static async sendRoll({
    parts = [],
    data: context = {},
    title = null,
    flavor = null,
    speaker = null,
    form = null,
  } = {}) {
    const template = "systems/acks/templates/chat/roll-result.html";

    let chatData = {
      user: game.user.id,
      speaker: speaker,
    };

    let templateData = {
      title: title,
      flavor: flavor,
      data: context,
    };

    // Optionally include a situational bonus
    if (form !== null && form.bonus.value) {
      parts.push(form.bonus.value);
    }

    const roll = new Roll(parts.join("+"), context);
    await roll.evaluate({
      async: true,
    });

    // Convert the roll to a chat message and return the roll
    let rollMode = game.settings.get("core", "rollMode");
    rollMode = form ? form.rollMode.value : rollMode;

    // Force blind roll (ability formulas)
    if (context.roll.blindroll) {
      rollMode = game.user.isGM ? "selfroll" : "blindroll";
    }

    if (["gmroll", "blindroll"].includes(rollMode)) {
      chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    }

    if (rollMode === "selfroll") {
      chatData["whisper"] = [game.user.id];
    } else if (rollMode === "blindroll") {
      chatData["blind"] = true;
      context.roll.blindroll = true;
    }

    templateData.result = AcksDice.digestResult(context, roll);

    return new Promise((resolve) => {
      roll.render().then((r) => {
        templateData.rollACKS = r;
        renderTemplate(template, templateData).then((content) => {
          chatData.content = content;
          // Dice So Nice
          if (game.dice3d) {
            game.dice3d
              .showForRoll(
                roll,
                game.user,
                true,
                chatData.whisper,
                chatData.blind
              )
              .then((displayed) => {
                ChatMessage.create(chatData);
                resolve(roll);
              });
          } else {
            chatData.sound = CONFIG.sounds.dice;
            ChatMessage.create(chatData);
            resolve(roll);
          }
        });
      });
    });
  }

  static digestAttackResult(context, roll) {
    let result = {
      isSuccess: false,
      isFailure: false,
      target: "",
      total: roll.total,
    };
    result.target = context.roll.thac0;

    const targetAc = context.roll.target
      ? context.roll.target.actor.system.ac.value
      : 9;
    const targetAac = context.roll.target
      ? context.roll.target.actor.system.aac.value
      : 0;
    result.victim = context.roll.target ? context.roll.target.name : null;

    const hfh = game.settings.get("acks", "exploding20s")
    const die = roll.dice[0].total
    
    if (game.settings.get("acks", "ascendingAC")) {
      if (die == 1 && !hfh) {
        result.details = game.i18n.format(
          "ACKS.messages.Fumble",
          {
            result: roll.total,
            bonus: result.target,
          }
        );
        return result;
      } else if (roll.total < targetAac + 10 && die < 20) {
        result.details = game.i18n.format(
          "ACKS.messages.AttackAscendingFailure",
          {
            result: roll.total - 10,
            bonus: result.target,
          }
        );
        return result;
      } else if (roll.total < targetAac + 10 && hfh) {
        result.details = game.i18n.format(
          "ACKS.messages.AttackAscendingFailure",
          {
            result: roll.total - 10,
            bonus: result.target,
          }
        );
        return result;
      }
      if (!hfh && die == 20) {
        result.details = game.i18n.format("ACKS.messages.Critical", {
          result: roll.total,
        });
      } else {      
        result.details = game.i18n.format("ACKS.messages.AttackAscendingSuccess", {
          result: roll.total - 10,
        });
      }
      result.isSuccess = true;
    } else {
      // B/X Historic THAC0 Calculation
      if (result.target - roll.total > targetAc) {
        result.details = game.i18n.format("ACKS.messages.AttackFailure", {
          bonus: result.target,
        });
        return result;
      }
      result.isSuccess = true;
      let value = Math.clamped(result.target - roll.total, -3, 9);
      result.details = game.i18n.format("ACKS.messages.AttackSuccess", {
        result: value,
        bonus: result.target,
      });
    }
    return result;
  }

  static async sendAttackRoll({
    parts = [],
    data: context = {},
    title = null,
    flavor = null,
    speaker = null,
    form = null,
  } = {}) {
    const template = "systems/acks/templates/chat/roll-attack.html";

    let chatData = {
      user: game.user._id,
      speaker: speaker,
    };

    let templateData = {
      title: title,
      flavor: flavor,
      data: context,
      config: CONFIG.ACKS,
    };

    // Optionally include a situational bonus
    if (form !== null && form.bonus.value) parts.push(form.bonus.value);

    const roll = new Roll(parts.join("+"), context);
    await roll.evaluate({
      async: true,
    });

    const dmgRoll = new Roll(context.roll.dmg.join("+"), context);
    await dmgRoll.evaluate({
      async: true,
    });

    // Add minimal damage of 1
    if (dmgRoll.total < 1) {
      dmgRoll._total = 1;
    }

    // Convert the roll to a chat message and return the roll
    let rollMode = game.settings.get("core", "rollMode");
    rollMode = form ? form.rollMode.value : rollMode;

    // Force blind roll (ability formulas)
    if (context.roll.blindroll) {
      rollMode = game.user.isGM ? "selfroll" : "blindroll";
    }

    if (["gmroll", "blindroll"].includes(rollMode))
      chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user._id];
    if (rollMode === "blindroll") {
      chatData["blind"] = true;
      context.roll.blindroll = true;
    }

    templateData.result = AcksDice.digestAttackResult(context, roll);

    return new Promise((resolve) => {
      roll.render().then((r) => {
        templateData.rollACKS = r;
        dmgRoll.render().then((dr) => {
          templateData.rollDamage = dr;
          renderTemplate(template, templateData).then((content) => {
            chatData.content = content;
            // 2 Step Dice So Nice
            if (game.dice3d) {
              game.dice3d
                .showForRoll(
                  roll,
                  game.user,
                  true,
                  chatData.whisper,
                  chatData.blind
                )
                .then(() => {
                  if (templateData.result.isSuccess) {
                    templateData.result.dmg = dmgRoll.total;
                    game.dice3d
                      .showForRoll(
                        dmgRoll,
                        game.user,
                        true,
                        chatData.whisper,
                        chatData.blind
                      )
                      .then(() => {
                        ChatMessage.create(chatData);
                        resolve(roll);
                      });
                  } else {
                    ChatMessage.create(chatData);
                    resolve(roll);
                  }
                });
            } else {
              chatData.sound = CONFIG.sounds.dice;
              ChatMessage.create(chatData);
              resolve(roll);
            }
          });
        });
      });
    });
  }

  static async RollSave({
    parts = [],
    data = {},
    skipDialog = false,
    speaker = null,
    flavor = null,
    title = null,
  } = {}) {
    let rolled = false;
    const template = "systems/acks/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" "),
      data: data,
      rollMode: game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
    };

    let rollData = {
      parts: parts,
      data: data,
      title: title,
      flavor: flavor,
      speaker: speaker,
    };
    
    let buttons = {}
    if (skipDialog) { return AcksDice.sendRoll(rollData); }
    if (game.settings.get("acks", "removeMagicBonus") == false) {
      buttons = {
        ok: {
          label: game.i18n.localize("ACKS.Roll"),
          icon: '<i class="fas fa-dice-d20"></i>',
          callback: (html) => {
            rolled = true;
            rollData.form = html[0].querySelector("form");
            roll = AcksDice.sendRoll(rollData);
          },
        },
        magic: {
          label: game.i18n.localize("ACKS.saves.magic.short"),
          icon: '<i class="fas fa-magic"></i>',
          callback: (html) => {
            rolled = true;
            rollData.form = html[0].querySelector("form");
            rollData.parts.push(`${rollData.roll.magic}`);
            rollData.title += ` ${game.i18n.localize("ACKS.saves.magic.short")} (${rollData.roll.magic})`;
            roll = AcksDice.sendRoll(rollData);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ACKS.Cancel"),
          callback: (html) => { },
        },
      };
    } else {
      buttons = {
        ok: {
          label: game.i18n.localize("ACKS.Roll"),
          icon: '<i class="fas fa-dice-d20"></i>',
          callback: (html) => {
            rolled = true;
            rollData.form = html[0].querySelector("form");
            rollData.parts.push(`${rollData.roll.magic}`);
            roll = AcksDice.sendRoll(rollData);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ACKS.Cancel"),
          callback: (html) => { },
        },
      };
    }
    const html = await renderTemplate(template, dialogData);
    let roll;

    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: "ok",
        close: () => {
          resolve(rolled ? roll : false);
        },
      }).render(true);
    });
  }

  static async Roll({
    parts = [],
    data: context = {},
    skipDialog = false,
    speaker = null,
    flavor = null,
    title = null,
  } = {}) {
    let rolled = false;
    const template = "systems/acks/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" "),
      data: context,
      rollMode: game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
    };

    let rollData = {
      parts: parts,
      data: context,
      title: title,
      flavor: flavor,
      speaker: speaker,
    };
    if (skipDialog) {
      return ["melee", "missile", "attack"].includes(context.roll.type)
        ? AcksDice.sendAttackRoll(rollData)
        : AcksDice.sendRoll(rollData);
    }

    let buttons = {
      ok: {
        label: game.i18n.localize("ACKS.Roll"),
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: (html) => {
          rolled = true;
          rollData.form = html[0].querySelector("form");
          roll = ["melee", "missile", "attack"].includes(context.roll.type)
            ? AcksDice.sendAttackRoll(rollData)
            : AcksDice.sendRoll(rollData);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("ACKS.Cancel"),
        callback: (html) => { },
      },
    };

    const html = await renderTemplate(template, dialogData);
    let roll;

    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: "ok",
        close: () => {
          resolve(rolled ? roll : false);
        },
      }).render(true);
    });
  }
}
