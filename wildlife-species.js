/*
 * Additional wildlife encyclopedia entries requested by the user.
 * Images are Wikimedia Commons candidates; the card fallback handles unavailable files.
 */
const WILDLIFE_SPECIES_DATA = [
  ['lion', 'Aslan', 'Panthera leo', 'mammal'],
  ['tiger', 'Kaplan', 'Panthera tigris', 'mammal'],
  ['leopard', 'Leopar', 'Panthera pardus', 'mammal'],
  ['jaguar', 'Jaguar', 'Panthera onca', 'mammal'],
  ['cheetah', 'Çita', 'Acinonyx jubatus', 'mammal'],
  ['snow-leopard', 'Kar Leoparı', 'Panthera uncia', 'mammal'],
  ['clouded-leopard', 'Bulutlu Leopar', 'Neofelis nebulosa', 'mammal'],
  ['puma', 'Puma', 'Puma concolor', 'mammal'],
  ['caracal', 'Karakulak', 'Caracal caracal', 'mammal'],
  ['serval', 'Serval', 'Leptailurus serval', 'mammal'],
  ['african-wild-dog', 'Afrika Yaban Köpeği', 'Lycaon pictus', 'mammal'],
  ['gray-wolf', 'Bozkurt', 'Canis lupus', 'mammal'],
  ['arctic-wolf', 'Kutup Kurdu', 'Canis lupus arctos', 'mammal'],
  ['red-fox', 'Kızıl Tilki', 'Vulpes vulpes', 'mammal'],
  ['fennec-fox', 'Fenek Tilkisi', 'Vulpes zerda', 'mammal'],
  ['brown-bear', 'Boz Ayı', 'Ursus arctos', 'mammal'],
  ['polar-bear', 'Kutup Ayısı', 'Ursus maritimus', 'mammal'],
  ['giant-panda', 'Dev Panda', 'Ailuropoda melanoleuca', 'mammal'],
  ['raccoon', 'Rakun', 'Procyon lotor', 'mammal'],
  ['meerkat', 'Mirket', 'Suricata suricatta', 'mammal'],
  ['red-squirrel', 'Kızıl Sincap', 'Sciurus vulgaris', 'mammal'],
  ['eastern-gray-squirrel', 'Doğu Gri Sincabı', 'Sciurus carolinensis', 'mammal'],
  ['fox-squirrel', 'Tilki Sincabı', 'Sciurus niger', 'mammal'],
  ['flying-squirrel', 'Uçan Sincap', 'Pteromys volans', 'mammal'],
  ['giant-squirrel', 'Dev Sincap', 'Ratufa indica', 'mammal'],
  ['prevosts-squirrel', 'Prevost Sincabı', 'Callosciurus prevostii', 'mammal'],
  ['prairie-dog', 'Çayır Köpeği', 'Cynomys ludovicianus', 'mammal'],
  ['capybara', 'Kapibara', 'Hydrochoerus hydrochaeris', 'mammal'],
  ['african-elephant', 'Afrika Fili', 'Loxodonta africana', 'mammal'],
  ['asian-elephant', 'Asya Fili', 'Elephas maximus', 'mammal'],
  ['black-rhinoceros', 'Siyah Gergedan', 'Diceros bicornis', 'mammal'],
  ['giraffe', 'Zürafa', 'Giraffa camelopardalis', 'mammal'],
  ['common-hippopotamus', 'Su Aygırı', 'Hippopotamus amphibius', 'mammal'],
  ['saltwater-crocodile', 'Tuzlu Su Timsahı', 'Crocodylus porosus', 'reptile'],
  ['nile-crocodile', 'Nil Timsahı', 'Crocodylus niloticus', 'reptile'],
  ['american-alligator', 'Amerikan Aligatörü', 'Alligator mississippiensis', 'reptile'],
  ['komodo-dragon', 'Komodo Ejderi', 'Varanus komodoensis', 'reptile'],
  ['green-anaconda', 'Yeşil Anakonda', 'Eunectes murinus', 'reptile'],
  ['king-cobra', 'Kral Kobra', 'Ophiophagus hannah', 'reptile'],
  ['bald-eagle', 'Kel Kartal', 'Haliaeetus leucocephalus', 'bird'],
  ['golden-eagle', 'Kaya Kartalı', 'Aquila chrysaetos', 'bird'],
  ['harpy-eagle', 'Harpy Kartalı', 'Harpia harpyja', 'bird'],
  ['peregrine-falcon', 'Gökdoğan', 'Falco peregrinus', 'bird'],
  ['red-tailed-hawk', 'Kızıl Kuyruklu Şahin', 'Buteo jamaicensis', 'bird'],
  ['great-horned-owl', 'Puhu', 'Bubo virginianus', 'bird'],
  ['snowy-owl', 'Karlı Baykuş', 'Bubo scandiacus', 'bird'],
  ['common-owl', 'Peçeli Baykuş', 'Tyto alba', 'bird'],
  ['king-vulture', 'Kral Akbaba', 'Sarcoramphus papa', 'bird'],
  ['ostrich', 'Devekuşu', 'Struthio camelus', 'bird'],
  ['emu', 'Emu', 'Dromaius novaehollandiae', 'bird'],
  ['cassowary', 'Kasuar', 'Casuarius casuarius', 'bird'],
  ['blue-peafowl', 'Mavi Tavuskuşu', 'Pavo cristatus', 'bird'],
  ['scarlet-macaw', 'Kızıl Amerika Papağanı', 'Ara macao', 'bird']
];

const WILDLIFE_CATEGORY_NAMES = {
  mammal: 'Egzotik Memeli',
  reptile: 'Sürüngen',
  bird: 'Kuş'
};

const wildlifeImageUrl = scientificName =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(scientificName)}.jpg?width=640`;

const WILDLIFE_ENTRIES = WILDLIFE_SPECIES_DATA.map(([id, name, scientificName, category]) => ({
  id: `wildlife-${id}`,
  name,
  scientificName,
  category,
  categoryName: WILDLIFE_CATEGORY_NAMES[category],
  difficulty: 'Uzman',
  difficultyLevel: 4,
  habitat: 'Türüne uygun doğal yaşam alanı',
  origin: 'Türüne göre değişir',
  lifespan: 'Türüne göre değişir',
  adultSize: 'Türüne göre değişir',
  tempHot: 'Evcil bakım türü değildir',
  tempCold: 'Evcil bakım türü değildir',
  humidity: 'Doğal habitatına göre değişir',
  dietType: 'Türüne göre değişir',
  favoriteFood: 'Yabani hayvan beslenmesi uzman kaynağından araştırılmalı',
  uvbRequired: 'Türüne göre değişir',
  handling: 'Kesinlikle ele alınmamalıdır.',
  badgeColor: 'rose',
  image: wildlifeImageUrl(scientificName),
  imageSource: `https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(scientificName)}`,
  imageIsCommonsCandidate: true,
  shortDesc: `${name}, doğal yaşam ve tür ansiklopedisi kapsamında tanıtılan bir yabani hayvandır.`,
  careSummary: 'Bu kayıt evcil hayvan önerisi değildir. Türün doğal yaşamı, korunma durumu ve yasal statüsü güvenilir kaynaklardan incelenmelidir.',
  dangerNotes: 'Yabani, büyük veya yırtıcı hayvanlar ev ortamında tutulmamalıdır. Gözlem ve koruma bilgisi için hazırlanmıştır.'
}));

const existingWildlifeScientificNames = new Set(
  EXOTIC_ANIMALS_DATA.map(species => String(species.scientificName || '').trim().toLocaleLowerCase('en-US'))
);
EXOTIC_ANIMALS_DATA = [
  ...EXOTIC_ANIMALS_DATA,
  ...WILDLIFE_ENTRIES.filter(species =>
    !existingWildlifeScientificNames.has(species.scientificName.toLocaleLowerCase('en-US'))
  )
];
