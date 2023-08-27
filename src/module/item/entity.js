// called from acks.js for AcksItem

import { AcksDice } from "../dice.js"; //verified

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class AcksItem extends Item {
  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // Set default image
    let img = CONST.DEFAULT_TOKEN;
    //DEBUG REFACTOR - change this.data.type to this.type per
    // "You should now reference keys which were previously contained within the data object directly."
    switch (this.type) {
      case "spell":
        img = "/systems/acks/assets/default/spell.png";
        break;
      case "ability":
        img = "/systems/acks/assets/default/ability.png";
        break;
      case "armor":
        img = "/systems/acks/assets/default/armor.png";
        break;
      case "weapon":
        img = "/systems/acks/assets/default/weapon.png";
        break;
      case "item":
        img = "/systems/acks/assets/default/item.png";
        break;
    }
    if (!this.img) this.img = img; //DEBUG REFACTOR - change this.data.type to this.type per
    // (NOTE - I only swapped out the second one to this.img, in the parenthesis left it alone)
    super.prepareData();
  }

  static chatListeners(html) {
    html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }











  // ::: V11 compatibility ::: - make "getChatData" async to allow for proper retrieval of html data
  // HTMLOptions can be empty
  // DID NOT BREAK on application of async
  async getChatData(htmlOptions) {
    console.log(
      'DEBUG: ---->>>>>>>>> \n Enter async getChatData()'
    );
    console.log("DEBUG: are there htmlOptions?: \n ---------------------- \n ");
    console.log(htmlOptions);
    console.log('DEBUG: what is "this" object? (AcksItem??): \n ---------------------- \n ');
    console.log(this);

    //originally this.data.data
    //::: V11 compatibility ::: try this.system - and we stop using "data" since it appears protected, so now "tempData"
    const tempData = duplicate(this.system);
    // convert this.type  to a local scope
    const entryType = this.type;
    //labels for later properties - search remarks for this.labels below
    const labels = this.labels;


    //::: V11 compatibility ::: - added "await" here - required
    // Also changed this to a constant for the purposes of handover / construction
    const prettyDescription = await TextEditor.enrichHTML(tempData.description);

    console.log("DEBUG: Start building props: \n ---------------------- \n");

    // Item properties
    const props = [];

    //moved this up to consolidate all "this" calls where possible
    // const labels = this.labels;
    console.log( "DEBUG: Finished" );

    // DEBUG entry
    console.log(
      "DEBUG: entry type: \n -------------------"
    );
    console.log(entryType);



    console.log(
      "DEBUG: If-cases for entity type for chat  \n -------------------"
    );
    if (entryType == "weapon") {
      console.log("DEBUG: entryType is a weapon");
      tempData.tags.forEach((t) => props.push(t.value));
    }
    if (entryType == "spell") {
      console.log("DEBUG: entryType is a spell");
      props.push(`${tempData.class} ${tempData.lvl}`, tempData.range, tempData.duration);
    }

    // DEBUG entry
    console.log("DEBUG: check if item is equipped?: " + tempData.equipped + '\n --------------------------');

    if (tempData.hasOwnProperty("equipped")) {
      console.log('DEBUG: the property "equipped" exists, and will change status ');
      console.log('DEBUG: equipped status is:  ');
      console.log(tempData.equipped);
      console.log('-------------------------------');

      props.push(tempData.equipped ? "Equipped" : "Not Equipped");
    }

    // Filter properties and return
    tempData.properties = props.filter((p) => !!p);
    console.log('DEBUG: tempData before RETURN and exiting: \n -------------------------  ');
    console.log(' -------------------------  ');
    console.log(tempData);


    return tempData;
  }
















  rollWeapon(options = {}) {
    let isNPC = this.actor.data.type != "character";
    const targets = 5;
    const data = this.data.data;
    let type = isNPC ? "attack" : "melee";
    const rollData = {
      item: this.data,
      actor: this.actor.data,
      roll: {
        save: this.data.data.save,
        target: null,
      },
    };

    if (data.missile && data.melee && !isNPC) {
      // Dialog
      new Dialog({
        title: "Choose Attack Range",
        content: "",
        buttons: {
          melee: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: "Melee",
            callback: () => {
              this.actor.targetAttack(rollData, "melee", options);
            },
          },
          missile: {
            icon: '<i class="fas fa-bullseye"></i>',
            label: "Missile",
            callback: () => {
              this.actor.targetAttack(rollData, "missile", options);
            },
          },
        },
        default: "melee",
      }).render(true);
      return true;
    } else if (data.missile && !isNPC) {
      type = "missile";
    }
    this.actor.targetAttack(rollData, type, options);
    return true;
  }

  async rollFormula(options = {}) {
    const data = this.data.data;
    if (!data.roll) {
      throw new Error("This Item does not have a formula to roll!");
    }

    const label = `${this.name}`;
    const rollParts = [data.roll];

    let type = data.rollType;

    const newData = {
      actor: this.actor.data,
      item: this.data,
      roll: {
        type: type,
        target: data.rollTarget,
        blindroll: data.blindroll,
      },
    };

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: newData,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.formula", { label: label }),
      title: game.i18n.format("ACKS.roll.formula", { label: label }),
    });
  }

  spendSpell() {
    this.update({
      data: {
        cast: this.data.data.cast + 1,
      },
    }).then(() => {
      this.show({ skipDialog: true });
    });
  }

  getTags() {
    let formatTag = (tag, icon) => {
      if (!tag) return "";
      let fa = "";
      if (icon) {
        fa = `<i class="fas ${icon}"></i> `;
      }
      return `<li class='tag'>${fa}${tag}</li>`;
    };

    const data = this.system; //refactoring this.system instead of this.data.data
    switch (
      this.type //refactoring
    ) {
      case "weapon":
        let wTags = formatTag(data.damage, "fa-tint");
        data.tags.forEach((t) => {
          wTags += formatTag(t.value);
        });
        wTags += formatTag(CONFIG.ACKS.saves_long[data.save], "fa-skull");
        if (data.missile) {
          wTags += formatTag(
            data.range.short + "/" + data.range.medium + "/" + data.range.long,
            "fa-bullseye"
          );
        }
        return wTags;
      case "armor":
        return `${formatTag(CONFIG.ACKS.armor[data.type], "fa-tshirt")}`;
      case "item":
        return "";
      case "spell":
        let sTags = `${formatTag(data.class)}${formatTag(
          data.range
        )}${formatTag(data.duration)}${formatTag(data.roll)}`;
        if (data.save) {
          sTags += formatTag(CONFIG.ACKS.saves_long[data.save], "fa-skull");
        }
        return sTags;
      case "ability":
        let roll = "";
        roll += data.roll ? data.roll : "";
        roll += data.rollTarget ? CONFIG.ACKS.roll_type[data.rollType] : "";
        roll += data.rollTarget ? data.rollTarget : "";
        return `${formatTag(data.requirements)}${formatTag(roll)}`;
    }
    return "";
  }

  pushTag(values) {
    const data = this.data.data;
    let update = [];
    if (data.tags) {
      update = duplicate(data.tags);
    }
    let newData = {};
    var regExp = /\(([^)]+)\)/;
    if (update) {
      values.forEach((val) => {
        // Catch infos in brackets
        var matches = regExp.exec(val);
        let title = "";
        if (matches) {
          title = matches[1];
          val = val.substring(0, matches.index).trim();
        } else {
          val = val.trim();
          title = val;
        }
        // Auto fill checkboxes
        switch (val) {
          case CONFIG.ACKS.tags.melee:
            newData.melee = true;
            break;
          case CONFIG.ACKS.tags.slow:
            newData.slow = true;
            break;
          case CONFIG.ACKS.tags.missile:
            newData.missile = true;
            break;
        }
        update.push({ title: title, value: val });
      });
    } else {
      update = values;
    }
    newData.tags = update;
    return this.update({ data: newData });
  }

  popTag(value) {
    const data = this.data.data;
    let update = data.tags.filter((el) => el.value != value);
    let newData = {
      tags: update,
    };
    return this.update({ data: newData });
  }

  roll() {
    switch (this.type) {
      case "weapon":
        this.rollWeapon();
        break;
      case "spell":
        this.spendSpell();
        break;
      case "ability":
        if (this.data.data.roll) {
          this.rollFormula();
        } else {
          this.show();
        }
        break;
      case "item":
      case "armor":
        this.show();
    }
  }

  /**
   * Show the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   *
   * ::: DEBUG :::
   */
  async show() {
    // Basic template rendering data
    // Actor#token has been renamed to Actor#prototypeToken
    console.log("DEBUG - called to show() item");
    console.log("DEBUG - What is 'this' within show() ?");
    console.log(this);

    //create local scope variables and constants
    const token = this.actor.prototypeToken;

    console.log(
      " DEBUG: async show() - get token and constant/create the templateData"
    );

    console.log(
      " DEBUG: we have the token: show token: \n ---------------------------"
    );
    console.log(token);
    console.log(
      " DEBUG: continue to create templateData including call to getChatData()"
    );
    console.log(
      " ---------------------------------------------------------------------"
    );
    console.log(
      " DEBUG: calls \n this.actor \n CONFIG.ACKS \nthis.getChatData() for data \n this.hasDamage \n this.hasSave \n this.isHealing \n this.data.type for spell \n this.data for item \n this.labels \n token"
    );
    // reconstructed into alphabetical order for ease of debugging
    //replaced "data" with otherData 
    // also update "data" entries in item-card.html
    
    
    
    const receivedChatData = await this.getChatData();


    const templateData = {
      actor: this.actor,
      config: CONFIG.ACKS,
      otherData: receivedChatData,
      hasDamage: this.hasDamage,
      hasSave: this.hasSave,
      isHealing: this.isHealing,
      isSpell: this.data.type === "spell",
      item: this.data,
      labels: this.labels,
      tokenId: token ? `${token.parent.id}.${token.id}` : null,
    };

    // Render the chat card template
    console.log("DEBUG: Completed assembly of templatData");
    console.log(
      "DEBUG: async show() - get html data and render the template for chat"
    );
    console.log(templateData);
    console.log("DEBUG: look for template data above");

    console.log("DEBUG: getting the HTML template");

    const template = `systems/acks/templates/chat/item-card.html`;

    console.log('DEBUG: content of "template": \n ---------------------------');
    console.log(template);
    console.log(templateData);
    console.log('---------------------------');


    console.log('DEBUG: calling "rendertemplate"');
    const html = await renderTemplate(template, templateData);

    console.log("DEBUG: building the chatData for show()");
    console.log("DEBUG: uses: \n html from above \n this.actor.id \n this.actor.token \n this.actor.name ");

    // Basic chat message data
    const chatData = {
      content: html,
      speaker: {
        actor: this.actor.id,
        // Actor#token has been renamed to Actor#prototypeToken - try reverting to token
        token: this.actor.token,
        alias: this.actor.name,
      },
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      user: game.user.id,
    };

    console.log("DEBUG: chatdatabuilt");
    console.log(chatData);

    console.log("DEBUG: enter roll mode");

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode))
      chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    console.log(
      "DEBUG: complete roll mode - return chatMessage.create(chatData)"
    );
    console.log("DEBUG: Chatmessage is apparentlyan API call in Foundry");

    console.log ('DEBUG - exiting show() and returning with ChatMessage.create(chatData)');
    // ::: DEBUG ::: Create the chat message
    return ChatMessage.create(chatData);
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    if (content.style.display == "none") {
      $(content).slideDown(200);
    } else {
      $(content).slideUp(200);
    }
  }

  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargetted = action === "save";
    if (!(isTargetted || game.user.isGM || message.isAuthor)) return;

    // Get the Actor from a synthetic Token
    const actor = this._getChatCardActor(card);
    if (!actor) return;

    // Get the Item
    const item = actor.items.get(card.dataset.itemId);
    if (!item) {
      return ui.notifications.error(
        `The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`
      );
    }

    // Get card targets
    let targets = [];
    if (isTargetted) {
      targets = this._getChatCardTargets(card);
    }

    // Attack and Damage Rolls
    if (action === "damage") await item.rollDamage({ event });
    else if (action === "formula") await item.rollFormula({ event });
    // Saving Throws for card targets
    else if (action == "save") {
      if (!targets.length) {
        ui.notifications.warn(
          `You must have one or more controlled Tokens in order to use this option.`
        );
        return (button.disabled = false);
      }
      for (let t of targets) {
        await t.rollSave(button.dataset.save, { event });
      }
    }

    // Re-enable the button
    button.disabled = false;
  }

  static _getChatCardActor(card) {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) return null;
      const tokenData = scene.tokens.get(tokenId);
      if (!tokenData) return null;
      const token = new Token(tokenData);
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  static _getChatCardTargets(card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce(
      (arr, t) => (t.actor ? arr.concat([t.actor]) : arr),
      []
    );
    if (character && controlled.length === 0) targets.push(character);
    return targets;
  }
}
