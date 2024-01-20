//called from party.js for AcksPartySheet

export class AcksPartySheet extends FormApplication {
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["acks", "dialog", "party-sheet"],
      template: "systems/acks/templates/apps/party-sheet.html",
      width: 280,
      height: 400,
      resizable: true,
    });
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return game.i18n.localize("ACKS.dialog.partysheet");
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    const settings = {
      ascending: game.settings.get('acks', 'ascendingAC')
    };

    const context = {
      system: this.object,
      config: CONFIG.ACKS,
      user: game.user,
      settings: settings
    };

    return context;
  }

  _onDrop(event) {
    event.preventDefault();
    // WIP Drop Items
    let context;
    try {
      context = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (context.type !== "Item") return;
    } catch (err) {
      return false;
    }
  }
  /* -------------------------------------------- */

  _dealXP(ev) {
    // Grab experience
    const template = `
      <form>
        <div class="form-group">
          <label>Amount</label>
          <input name="total" placeholder="0" type="text"/>
        </div>
      </form>
    `;

    let pcs = this.object.documents.filter((actor) => {
      return actor.getFlag('acks', 'party') && actor.type === "character";
    });

    new Dialog({
      title: "Deal Experience",
      content: template,
      buttons: {
        set: {
          icon: '<i class="fas fa-hand"></i>',
          label: game.i18n.localize("ACKS.dialog.dealXP"),
          callback: (html) => {
            let toDeal = html.find('input[name="total"]').val();
            // calculate number of shares
            let shares = 0;
            pcs.forEach(c => {shares += c.system.details.xp.share});
            const value = parseFloat(toDeal) / shares;
            if (value) {
              // Give experience
              pcs.forEach((c) => {
                c.getExperience(Math.floor(c.system.details.xp.share * value));
              });
            }
          },
        },
      },
    }).render(true);
  }

  async _selectActors(event) {
    event.preventDefault();

    const template = "/systems/acks/templates/apps/party-select.html";
    const templateData = {
      actors: this.object.documents,
    };
    const content = await renderTemplate(template, templateData);
    new Dialog({
      title: "Select Party Characters",
      content: content,
      buttons: {
        set: {
          icon: '<i class="fas fa-save"></i>',
          label: game.i18n.localize("ACKS.Update"),
          callback: (html) => {
            let checks = html.find("input[data-action='select-actor']");
            checks.each(async (_, c) => {
              let key = c.getAttribute('name');
              await this.object.documents[key].setFlag('acks', 'party', c.checked);
            });
          },
        },
      },
    }, {height: "auto", width: 220}).render(true);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html
      .find(".item-controls .item-control .select-actors")
      .click(this._selectActors.bind(this));

    html.find(".item-controls .item-control .deal-xp").click(this._dealXP.bind(this));

    html.find("a.resync").click(() => this.render(true));

    html.find(".field-img button[data-action='open-sheet']").click((ev) => {
      let actorId = ev.currentTarget.parentElement.parentElement.parentElement.dataset.actorId;
      game.actors.get(actorId).sheet.render(true);
    })
  }
}
