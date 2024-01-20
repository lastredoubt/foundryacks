// called from acks.js to load AcksActorSheetCharacter


import { AcksActor } from "./entity.js"; //verified
import { AcksActorSheet } from "./actor-sheet.js"; //verified
import { AcksCharacterModifiers } from "../dialog/character-modifiers.js"; //verified
import { AcksCharacterCreator } from "../dialog/character-creation.js"; //verified

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export class AcksActorSheetCharacter extends AcksActorSheet {
  constructor(...args) {
    super(...args);
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["acks", "sheet", "actor", "character"],
      template: "systems/acks/templates/actors/character-sheet.html",
      width: 450,
      height: 530,
      resizable: true,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
    });
  }

  generateScores() {
    new AcksCharacterCreator(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const context = super.getData();

    context.config.ascendingAC = game.settings.get("acks", "ascendingAC");
    context.config.initiative = game.settings.get("acks", "initiative") != "group";
    context.config.BHR = game.settings.get("acks", "bhr");
    context.config.removeMagicBonus = game.settings.get("acks", "removeMagicBonus");

    context.isNew = this.actor.isNew();
    return context;
  }


  async _chooseLang() {
    let choices = CONFIG.ACKS.languages;

    let templateData = { choices: choices },
      dlg = await renderTemplate(
        "/systems/acks/templates/actors/dialogs/lang-create.html",
        templateData
      );
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: "",
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize("ACKS.Ok"),
            icon: '<i class="fas fa-check"></i>',
            callback: (html) => {
              resolve({
                choice: html.find('select[name="choice"]').val(),
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("ACKS.Cancel"),
          },
        },
        default: "ok",
      }).render(true);
    });
  }

  _pushLang(table) {
    const context = this.actor.system;
    let update = duplicate(context[table]);
    this._chooseLang().then((dialogInput) => {
      const name = CONFIG.ACKS.languages[dialogInput.choice];
      if (update.value) {
        update.value.push(name);
      } else {
        update = { value: [name] };
      }
      let newContext = {};
      newContext[table] = update;
      return this.actor.updateSource({ system: newContext });
    });
  }

  _popLang(table, lang) {
    const context = this.actor.system;
    let update = context[table].value.filter((el) => el != lang);
    let newContext = {};
    newContext[table] = { value: update };
    return this.actor.updateSource({ system: newContext });
  }

  /* -------------------------------------------- */

  async _onQtChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    //this item.update appears to call the standard update call in JS 

    return item.updateSource({ "system.quantity.value": parseInt(event.target.value) });
  }

  _onShowModifiers(event) {
    event.preventDefault();
    new AcksCharacterModifiers(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".morale-check a").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollMorale({ event: event });
    });

    html.find(".loyalty-check a").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollLoyalty({ event: event });
    });

    html.find(".ability-score .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      let element = ev.currentTarget;
      let score = element.parentElement.parentElement.dataset.score;
      let stat = element.parentElement.parentElement.dataset.stat;
      if (!score) {
        if (stat == "lr") {
          actorObject.rollLoyalty(score, { event: event });
        }
      } else {
        actorObject.rollCheck(score, { event: event });
      }
    });

    html.find(".exploration .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      let element = event.currentTarget;
      let expl = element.parentElement.parentElement.dataset.exploration;
      actorObject.rollExploration(expl, { event: event });
    });

    html.find(".inventory .item-titles .item-caret").click((ev) => {
      let items = $(event.currentTarget.parentElement.parentElement).children(
        ".item-list"
      );
      if (items.css("display") == "none") {
        let el = $(event.currentTarget).find(".fas.fa-caret-right");
        el.removeClass("fa-caret-right");
        el.addClass("fa-caret-down");
        items.slideDown(200);
      } else {
        let el = $(event.currentTarget).find(".fas.fa-caret-down");
        el.removeClass("fa-caret-down");
        el.addClass("fa-caret-right");
        items.slideUp(200);
      }
    });

    html.find("a[data-action='modifiers']").click((ev) => {
      this._onShowModifiers(ev);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [
        li.data("itemId"),
      ]);
      li.slideUp(200, () => this.render(false));
    });

    html.find(".item-push").click((ev) => {
      event.preventDefault();
      const header = event.currentTarget;
      const table = header.dataset.array;
      this._pushLang(table);
    });

    html.find(".item-pop").click((ev) => {
      event.preventDefault();
      const header = event.currentTarget;
      const table = header.dataset.array;
      this._popLang(
        table,
        $(event.currentTarget).closest(".item").data("lang")
      );
    });

    html.find(".item-create").click(async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      const itemData = {
        name: `New ${type.capitalize()}`,
        type: type,
        system: duplicate(header.dataset),
      };
      delete itemData.system["type"];
      await this.actor.createEmbeddedDocuments("Item", [
        itemData,
      ]);
    });

    //Toggle Equipment
    html.find(".item-toggle").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      //this item.update appears to call the standard update call in JS 

      await item.updateSource({
        _id: li.data("itemId"),
        system: {
          equipped: !item.system.equipped,
        },
      });
    });

    html
      .find(".quantity input")
      .click((ev) => ev.target.select())
      .change(this._onQtChange.bind(this));

    html.find("a[data-action='generate-scores']").click((ev) => {
      this.generateScores(ev);
    });
  }
}
