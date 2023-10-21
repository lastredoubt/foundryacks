# **Adventurer Conqueror King System** for Foundry VTT
This game system for Foundry Virtual Tabletop provides character sheet and game system support for the Adventurer Conqueror King System (ACKS).

This system provides mechanics and character sheet support, and features a compendium with Monsters, Items, Spells, Proficiencies, Abilities, and more, all to make the judge's job easier for running ACKS games on the Foundry VTT. Also included is a world map of the Auran Empire (the default setting of ACKS) - although the judge is free to ignore it. Every campaign is a law unto itself.

ACKS, like most B/X clones, is also broadly compatible with thousands of modules and other OSR content and rulesets with a minimum of conversion necessary.

## Current branch / dev help

I'll try to look at pull requests as submitted. We've enabled issues, but haven't created any at the time of this writing

The main branch is essentially a fork of the original ACKS module from Happy Anarchist things stand. The lr-refactoring branch has been where I've done most of the fixes. Once we have something that doesn't simply load, but provides a playable experience, I intend to merge that as an initial release and register the module at foundry for use in ACKS. 



## Current Fix Priorities / Investigating

See : <https://foundryvtt.com/article/migration/>

- the entirety of the changes revolving around migrating to a new datamodel class - see also <https://foundryvtt.com/article/v10-data-model/>
- character generator does not auto-roll, or push forward attributes for new character
- PackageData fields which were previously arrays including: authors, scripts, esmodules, styles, languages, packs, system, and dependencies now use the new SetField type. (6700)
- Introduced new relationships field for package manifests which replaces the now-deprecated dependencies field. (7075)
- Deprecated isObjectEmpty in favor of isEmpty. (7128)
- mergeObject now supports a new performDeletions option to control whether it implements the '-=' shortcut prefixed delete instructions or ignores them. (6582)
- Compendiums containing Actors, Items, and Adventures now have a strict requirement to declare the system which they are compatible with, either directly or indirectly via package relationships. (7636)

- Verify that changes in game canvas and interface and application are brought up to date to prevent current issues and future depracation


## Resolved

- The name field in manifest JSON files (including the dependency field) is being deprecated in favor of id, to reduce confusion about its purpose. There will be a deprecation period for this change and it will become enforced in Version 11. (7009)
- The author field in manifest JSON is being deprecated in favor of authors in the interest of offering a single standardized way to present the author or authors of a package. (7010)
- Introduced new compatibility field for package manifests which replaces the now-deprecated minimumCoreVersion and compatibleCoreVersion fields. (7011)
- Refactored "Required Schema Changes" per https://foundryvtt.com/article/v10-data-model/




## ACKS for Foundry VTT Features
#### **Core Rules**
- ACKS encumbrance rules (*using coin weight instead of stone* - 1000 coins to a stone)  
- ACKS Armor Class (Ascending starting from 0)
- Uncapped dexterity and charisma bonuses  
- Exploration checks (hear noise, open door, etc) are 1d20 skill checks  
- Tweak section of the character sheet to modify throws, AC, etc for proficiencies or class bonuses
- "Slow Weapon" checkbox on items to subtract 1 from an actor's initiative if equipped
- HOLD TURN icon in the Combat Tracker to remind the judge that a player has held their action
- Encumbrance bar to reflect movement rates while encumbered
- Pre-programmed saving throws for monsters based on HD
- Auran setting languages in addition to standard tongues
- Morale and Loyalty tracking for Henchmen
- The ACKS Compendium has the majority of equipment, proficiencies, and spells from the Core Book
- ACKS Spellcasting, instead of Vancian
- ACKS Core Treasure Tables by Bobloblah
#### **Heroic Fantasy Handbook** (*optional*)
- Added an option to use exploding 20s in combat from HFH optional rules  
- Added an option to calculate Basic Healing Rate on the character sheet
- Added an option to apply wisdom bonus to all saves

## Manual Installation
To install and use this system, simply paste the following URL into the Install System dialog on the Setup menu of the application.

<https://github.com/thehappyanarchist/foundryacks/raw/master/src/system.json>

If you wish to manually install the system, you must clone or extract it into the foundry "/data/systems/acks" folder. You may do this by cloning the repository /src folder or downloading and extracting the zip archive available on the GitHub page.

## Community Contribution
Code and content contributions are accepted. Please feel free to submit issues to the issue tracker or submit merge requests for code changes. Approval for such requests involves code and (if necessary) design review by The Happy Anarchist. Please reach out on the [Autarch Discord](https://discord.gg/MabfMkk) ("vtt-collaboration" channel) with any questions.

Big thank you to Bobloblah for laying the foundation of the ACKS compendium! He put in an enormous effort, all to save judges tons of work in getting their campaigns started.

Thank you to Olle Skogren for contributing the Investment Vagary tables from AXIOMS 3. (Temporarily unavailable)

HUGE Mega-Thank you to Azarvel for his exhaustive work updating to Foundry v9.

## License
#### System
This system is offered and may be used under the terms of the Open Game License v1.0a and the Adventurer Conqueror King Product Identity License v1.0. Permission to develop and distribute the ACKS system for Foundry, and to create and distribute the content in the compendium have been granted by Autarch LLC.  

This code is modified from a fork of the v1.0 code of the Old School Essentials System written by U~Man, and released under the GNUv3 license. The software source of this system is also distributed under the GNUv3 license and is considered open source.  

Autarch, Adventurer Conqueror King, Adventurer Conqueror King System, and ACKS are trademarks of Autarch LLC. You may find further information about the system at <http://autarch.co>.
#### Artwork
Weapon quality icons, and the Treasure chest are from Rexxard, and came with the Old School Essentials System for Foundry VTT (Unofficial) by U~man which can be found at <https://gitlab.com/mesfoliesludiques/foundryvtt-ose>. Other icons used in the compendium are distributed under the Creative Commons 3.0 BY license and are available on <https://game-icons.net>. A list of icon authors and contributors for that project can be found on the website, or at <https://game-icons.net/about.html#authors>. Monster Tokens in the bundled ACKS Monsters Compendium are from the Free Token pack from Devin's Token Site and are made by Devin Night <https://immortalnights.com/tokensite/>. Other icons in the compendium are by Bobloblah or The Happy Anarchist. Map of the Auran Empire (default setting of ACKS) by The Happy Anarchist.
