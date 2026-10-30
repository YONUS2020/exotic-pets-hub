const EXTRA_SPECIES_DATA = [
  ['grammostola-rosea', 'Şili Gül Tarantulası', 'Grammostola rosea', 'Başlangıç', 'invertebrate', 'assets/species/chilean-rose-tarantula.jpg'],
  ['grammostola-pulchra', 'Brezilya Siyah Tarantulası', 'Grammostola pulchra', 'Başlangıç', 'invertebrate', 'assets/species/brazilian-black-tarantula.jpg'],
  ['lasiodora-parahybana', 'Salmon Pink Birdeater', 'Lasiodora parahybana', 'Orta', 'invertebrate', 'assets/species/salmon-pink-birdeater.jpg'],
  ['chromatopelma-cyaneopubescens', 'Green Bottle Blue Tarantulası', 'Chromatopelma cyaneopubescens', 'Orta', 'invertebrate', 'assets/species/greenbottle-blue-tarantula.jpg'],
  ['poecilotheria-metallica', 'Gooty Safir Tarantulası', 'Poecilotheria metallica', 'Uzman', 'invertebrate', 'assets/species/gooty-sapphire-tarantula.jpg'],
  ['pandinus-imperator', 'İmparator Akrep', 'Pandinus imperator', 'Başlangıç', 'invertebrate', 'assets/species/emperor-scorpion.jpg'],
  ['heterometrus-spinifer', 'Asya Orman Akrebi', 'Heterometrus spinifer', 'Orta', 'invertebrate', 'assets/species/asian-forest-scorpion.jpg'],
  ['scolopendra-subspinipes', 'Vietnam Çıyanı', 'Scolopendra subspinipes', 'Uzman', 'invertebrate', 'assets/species/tiger-centipede.jpg'],
  ['scolopendra-gigantea', 'Amazon Dev Çıyanı', 'Scolopendra gigantea', 'Uzman', 'invertebrate', 'assets/species/giant-amazonian-centipede.jpg'],
  ['python-regius', 'Top Pitonu', 'Python regius', 'Başlangıç', 'reptile', 'assets/species/ball-python.jpg'],
  ['pantherophis-guttatus', 'Mısır Yılanı', 'Pantherophis guttatus', 'Başlangıç', 'reptile', 'assets/species/corn-snake.jpg'],
  ['testudo-graeca', 'Mahmuzlu Akdeniz Kaplumbağası', 'Testudo graeca', 'Orta', 'reptile', 'assets/species/russian-tortoise.jpg'],
  ['petaurus-breviceps', 'Şeker Planörü', 'Petaurus breviceps', 'İleri', 'mammal', 'assets/species/sugar-glider.jpg'],
  ['carassius-auratus', 'Japon Balığı', 'Carassius auratus', 'Başlangıç', 'aquatic', 'assets/species/pea-puffer.jpg'],
  ['betta-splendens', 'Betta Balığı', 'Betta splendens', 'Başlangıç', 'aquatic', 'assets/species/pea-puffer.jpg']
].map(([id, name, scientificName, difficulty, category, image]) => ({
  id, name, scientificName, category, categoryName: category === 'reptile' ? 'Sürüngen' : category === 'mammal' ? 'Memeli' : category === 'aquatic' ? 'Akuatik canlı' : 'Eklem Bacaklı',
  difficulty, difficultyLevel: difficulty === 'Başlangıç' ? 1 : difficulty === 'Orta' ? 2 : 4,
  habitat: 'Türüne uygun doğal yaşam alanı', origin: 'Türüne göre değişir', lifespan: 'Türüne göre değişir', adultSize: 'Türüne göre değişir',
  tempHot: 'Tür rehberine göre ayarlanmalı', tempCold: 'Tür rehberine göre ayarlanmalı', humidity: 'Tür rehberine göre ayarlanmalı',
  dietType: 'Türüne uygun beslenme', favoriteFood: 'Güvenilir bakım rehberine göre', uvbRequired: 'Türüne göre değişir',
  handling: 'Türün davranışını araştırmadan elle tutmayın.', badgeColor: 'emerald', image,
  shortDesc: `${name} için temel bakım ve tür bilgileri.`, careSummary: 'Sıcaklık, nem, alan ve beslenme değerlerini güvenilir tür kaynaklarından doğrulayın.',
  dangerNotes: 'Her canlıyı türüne uygun güvenli yaşam alanında tutun; gerektiğinde egzotik hayvan veterinerine başvurun.'
}));

const existingExtraIds = new Set(EXOTIC_ANIMALS_DATA.map(species => species.id));
EXOTIC_ANIMALS_DATA = [...EXOTIC_ANIMALS_DATA, ...EXTRA_SPECIES_DATA.filter(species => !existingExtraIds.has(species.id))];
