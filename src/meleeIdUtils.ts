export const getCharacterNameFromId = (id: string) => {
    const id_number = parseInt(id);
    const characterNames = [
        'Captain Falcon',
        'Donkey Kong',
        'Fox',
        'Mr. Game & Watch',
        'Kirby',
        'Bowser',
        'Link',
        'Luigi',
        'Mario',
        'Marth',
        'Mewtwo',
        'Ness',
        'Peach',
        'Pikachu',
        'Ice Climbers',
        'Jigglypuff',
        'Samus',
        'Yoshi',
        'Zelda',
        'Sheik',
        'Falco',
        'Young Link',
        'Dr. Mario',
        'Roy',
        'Pichu',
        'Ganondorf',
    ]

    if (id_number < 0 || id_number >= characterNames.length) {
        return "Unknown";
    }
    return characterNames[id_number];
}

export const getStageNameFromId = (id: string) => {    
    const id_number = parseInt(id);
    const stageNames = [
        '',
        '',
        "Fountain of Dreams",
        "Pokémon Stadium",
        "Princess Peach's Castle",
        "Kongo Jungle",
        "Brinstar",
        "Corneria",
        "Yoshi's Story",
        "Onett",
        "Mute City",
        "Rainbow Cruise",
        "Jungle Japes",
        "Great Bay",
        "Hyrule Temple",
        "Brinstar Depths",
        "Yoshi's Island",
        "Green Greens",
        "Fourside",
        "Mushroom Kingdom I",
        "Mushroom Kingdom II",
        '',
        "Venom",
        "Poké Floats",
        "Big Blue",
        "Icicle Mountain",
        "Icetop",
        "Flat Zone",
        "Dream Land N64",
        "Yoshi's Island N64",
        "Kongo Jungle N64",
        "Battlefield",
        "Final Destination",
    ]

    if (id_number < 0 || id_number >= stageNames.length) {
        return "Unknown";
    }
    return stageNames[id_number];
}
