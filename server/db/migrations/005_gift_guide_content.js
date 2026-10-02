// Content: turns Gifts into a recipient-led gift guide, adds giftable products,
// tidies cross-listings that didn't fit their section, and replaces product
// photos that didn't show the product.
//
// Safe on any database: everything is matched by slug and skipped when the
// thing it depends on doesn't exist. A photo is only replaced while it is still
// the original catalog photo, so images changed in the admin are kept.
const U = (id) => `https://images.unsplash.com/photo-${id}`;
const amazonSearch = (name) => `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;

const RECIPIENTS = [
  ['for-her', 'For Her', 'Pieces she’ll wear, use and keep reaching for.', U('1766056278948-dbb10f6d82bf')],
  ['for-him', 'For Him', 'Upgrades he wouldn’t buy himself — and will use every day.', U('1783744087450-30bb151a7bf3')],
  ['for-the-home', 'For the Homebody', 'Cosy, calm and good-looking things for the place they love most.', U('1719513709219-1d6e405ea017')],
  ['for-tech-lovers', 'For Tech Lovers', 'Gadgets that earn a permanent spot, not a drawer.', U('1558584673-c834fb1cc3ca')],
  ['for-foodies', 'For Coffee & Food Lovers', 'For the friend who’s always in the kitchen — or the coffee queue.', U('1610874150308-a1e6f8c905d9')],
  ['stocking-stuffers', 'Stocking Stuffers', 'Small gifts that still feel thoughtful.', U('1622875665247-aefc5192dba2')],
];

const HOME_SUBCATEGORIES = [
  ['kitchen', 'Kitchen & Dining', 'Tools and tableware that make cooking and hosting a pleasure.', U('1770672438590-413eae05e595')],
  ['living', 'Living & Décor', 'Small, beautiful things that make a room feel finished.', U('1719513709219-1d6e405ea017')],
];

// Existing products that belong in the guide: slug → [recipients, gift note].
const PICKS = {
  // For her
  'structured-leather-tote-bag': [['for-her'], 'For the woman who carries her whole day with her — and wants it to look good.'],
  'crossbody-bag': [['for-her'], 'For hands-free weekends, city breaks and every errand in between.'],
  'gold-hoop-earrings': [['for-her', 'stocking-stuffers'], 'For the friend who wears gold every single day.'],
  'silk-feel-square-scarf': [['for-her', 'stocking-stuffers'], 'For tying on a bag, in her hair or at the neck — a small luxury she’ll use all year.'],
  'one-step-hair-dryer-brush': [['for-her'], 'For the friend who wants a salon blow-dry before work, without the salon.'],
  'silk-pillowcase': [['for-her', 'stocking-stuffers'], 'For better hair mornings — a small luxury she won’t buy herself.'],
  'gold-cross-body-bag': [['for-her'], 'For the friend who likes a little shine on a night out.'],
  'colourful-womens-lightweight-scarf-celestial-moon-print': [['for-her'], 'For the friend who loves a print with a story.'],
  'rainbow-jacquard-knitted-scarf': [['for-her'], 'For the colour lover who lives in knits from October to March.'],
  'teal-two-tone-cosy-knitted-scarf': [['for-her'], 'For winter walks, school runs and cold commutes.'],
  // For him
  'mens-minimalist-leather-strap-watch': [['for-him'], 'For the man who still likes to check the time on his wrist.'],
  'slim-card-wallet': [['for-him'], 'For the guy whose wallet has been falling apart for years.'],
  'leather-belt': [['for-him', 'stocking-stuffers'], 'For the one who owns a single belt — and it shows.'],
  'mens-merino-crewneck-sweater': [['for-him'], 'For the man who runs cold and refuses to admit it.'],
  'weekender-duffel-bag': [['for-him'], 'For the friend always planning the next weekend away.'],
  'beard-and-body-trimmer': [['for-him'], 'For the beard that deserves better than kitchen scissors.'],
  'heavyweight-hoodie': [['for-him'], 'For the hoodie he’ll wear until it falls apart.'],
  // For the home
  'sunrise-alarm-clock-with-sound-machine': [['for-the-home'], 'For the friend who hates winter mornings.'],
  'weighted-blanket-15-lb': [['for-the-home'], 'For the overthinker who needs a better night’s sleep.'],
  'heated-throw-blanket': [['for-the-home'], 'For the one who’s always cold on the sofa.'],
  'ultrasonic-essential-oil-diffuser': [['for-the-home', 'stocking-stuffers'], 'For the friend whose home always smells amazing — and the one who wishes theirs did.'],
  // For tech lovers
  'over-ear-noise-cancelling-headphones': [['for-tech-lovers'], 'For commuters, frequent flyers and open-plan survivors.'],
  'wireless-earbuds-with-charging-case': [['for-tech-lovers'], 'For the person whose old earbuds only work in one ear.'],
  'smartwatch': [['for-tech-lovers'], 'For the person who wants to check their phone less.'],
  'e-reader-with-front-light': [['for-tech-lovers'], 'For the reader whose suitcase is half books.'],
  'instant-print-camera': [['for-tech-lovers'], 'For the friend who makes every party worth remembering.'],
  'waterproof-bluetooth-speaker': [['for-tech-lovers'], 'For beach days, garden parties and singing in the shower.'],
  'low-profile-mechanical-keyboard': [['for-tech-lovers'], 'For the person who types all day and deserves to enjoy it.'],
  '3-in-1-charging-stand': [['for-tech-lovers'], 'For a nightstand that isn’t a tangle of cables.'],
  'fitness-tracker-band': [['for-tech-lovers'], 'For the friend starting a new routine.'],
  'compact-smart-speaker': [['for-tech-lovers'], 'For music, timers and reminders without picking up a phone.'],
  // For coffee & food lovers
  'electric-gooseneck-kettle-with-temperature-control': [['for-foodies'], 'For the pour-over perfectionist and the serious tea drinker.'],
  'handheld-milk-frother': [['for-foodies', 'stocking-stuffers'], 'For café-style lattes at home, for a fraction of the price.'],
  'temperature-control-smart-mug': [['for-foodies'], 'For the person who always forgets their coffee until it’s cold.'],
  'air-fryer': [['for-foodies'], 'For weeknight cooks who want crispy without the faff.'],
  'electric-wine-opener': [['for-foodies', 'stocking-stuffers'], 'For the host who’s fought one cork too many.'],
  'programmable-coffee-maker': [['for-foodies'], 'For the friend who isn’t a person until the first cup.'],
  'champagne-flutes-set-of-4': [['for-foodies'], 'For the friend who always has something to celebrate.'],
  // Stocking stuffers
  'ribbed-beanie': [['stocking-stuffers'], 'For winter walks and bad hair days.'],
  'insulated-stainless-steel-water-bottle': [['stocking-stuffers'], 'For the gym, the desk and the school run — cold all day.'],
  'contoured-sleep-mask': [['stocking-stuffers'], 'For light sleepers, nap lovers and long-haul flights.'],
  'green-satin-lined-ribbed-beanie': [['stocking-stuffers'], 'For warm ears and frizz-free hair — the satin lining is the secret.'],
  'blue-satin-lined-ribbed-beanie-hat': [['stocking-stuffers'], 'For warm ears and frizz-free hair — the satin lining is the secret.'],
  'pink-satin-lined-ribbed-beanie': [['stocking-stuffers'], 'For warm ears and frizz-free hair — the satin lining is the secret.'],
  'black-sparkle-phone-pocket-bag': [['stocking-stuffers'], 'For nights out with just a phone, a card and a lipstick.'],
};

// New products: [slug-source name, category, subcategory, approx price, recipients, extra tags,
//   short, best_for, not_for, pros, cons, gift note, photo id]
const NEW_PRODUCTS = [
  ['Satin pyjama set', 'fashion', 'women', 49, ['for-her'], ['women'],
    'A soft satin shirt-and-trousers set that feels like a hotel weekend.', 'Anyone who loves lounging in something nicer than an old T-shirt.', 'Hot sleepers who prefer breathable cotton.',
    ['Smooth, drapey fabric', 'Looks good enough for breakfast', 'Easy-care machine-washable options'], ['Sizing varies — check the chart', 'Satin can feel cool in winter'],
    'For the friend who deserves a slow Sunday morning.', '1766056278948-dbb10f6d82bf'],
  ['Gold heart pendant necklace', 'fashion', 'women', 35, ['for-her'], ['women'],
    'A small, polished heart on a fine chain — easy to wear every day.', 'Daily-jewellery wearers and first “real” jewellery gifts.', 'Anyone with metal sensitivities — check the materials.',
    ['Delicate and everyday', 'Layers with other chains', 'Arrives gift-ready on many listings'], ['Plated finishes can wear over time', 'Chain length varies'],
    'For the person you’d give your heart to — literally.', '1708222169031-590f016d7451'],
  ['Wooden jewellery box', 'fashion', 'bags-accessories', 39, ['for-her'], [],
    'A lidded wooden box that keeps rings, watches and chains in one place.', 'Anyone whose jewellery lives in a tangle on the dresser.', 'Large collections — check the compartment sizes.',
    ['Looks good on display', 'Protects pieces from scratches', 'Lots of sizes and finishes'], ['Real wood costs more', 'Smaller boxes fill up fast'],
    'For the friend whose favourite pieces deserve a proper home.', '1549315309-f0857a904065'],
  ['Leather wash bag', 'fashion', 'men', 45, ['for-him'], ['men', 'travel'],
    'A structured leather toiletry bag that ages well on every trip.', 'Frequent travellers and anyone still using a plastic bag for toiletries.', 'Ultralight packers — leather adds weight.',
    ['Wipe-clean lining', 'Holds full-size bottles', 'Gets better with age'], ['Heavier than nylon', 'Leather needs the odd condition'],
    'For the man who travels more than his toiletries bag suggests.', '1573248299419-21e681d0fadc'],
  ['Whisky glass set with chilling stones', 'home', 'kitchen', 35, ['for-him'], [],
    'Heavy-bottomed tumblers with stones that chill without watering the drink down.', 'Whisky and bourbon drinkers.', 'People who like their drinks properly ice-cold — stones only take the edge off.',
    ['Weighty, good-looking glasses', 'No diluted drinks', 'Often arrives in a gift box'], ['Stones need freezing beforehand', 'Hand-wash recommended'],
    'For the friend who takes his whisky seriously.', '1583873463426-776e17c904cf'],
  ['Leather valet tray', 'home', 'living', 29, ['for-him'], [],
    'A catch-all for keys, wallet, watch and earbuds by the door or bed.', 'Anyone who loses their keys every morning.', 'Minimalists with nothing to put in it.',
    ['Ends the morning key hunt', 'Snap corners fold flat for travel', 'Ages nicely'], ['Leather marks over time', 'Small trays fill quickly'],
    'For the man who loses his keys every single morning.', '1783744087450-30bb151a7bf3'],
  ['Hand-poured scented candle', 'home', 'living', 32, ['for-the-home', 'for-her'], [],
    'A soy-blend candle in a reusable vessel, with a slow, even burn.', 'Anyone who likes the house to feel cosy in the evening.', 'Homes with very curious pets — never leave a flame unattended.',
    ['Clean, even burn', 'Reusable jar afterwards', 'Easy gift for almost anyone'], ['Scent is personal — pick a gentle one', 'Trim the wick for the best burn'],
    'For the friend who lights a candle the second they get home.', '1760804876257-f073f77f2bcf'],
  ['Waffle-knit bathrobe', 'home', 'bedroom', 59, ['for-the-home', 'for-her'], ['bedroom'],
    'A light, absorbent waffle robe that feels like a spa weekend at home.', 'Anyone who loves a long bath or a slow Sunday.', 'People who want a heavy, fluffy winter robe.',
    ['Light and quick-drying', 'Soft without the bulk', 'Unisex sizing on many'], ['Less warm than plush terry', 'Check the length'],
    'For the friend who deserves a spa day at home.', '1609535895148-cf9f5c446290'],
  ['Ceramic bud vase set', 'home', 'living', 34, ['for-the-home'], [],
    'Three small textured vases for single stems, dried flowers or just on their own.', 'Shelf stylers and first-flat gifts.', 'Anyone who wants a big statement vase.',
    ['Looks good empty or filled', 'Works on shelves, tables and sills', 'Easy, safe gift'], ['Small openings suit single stems', 'Handmade looks vary'],
    'For the friend who just moved in and has bare shelves.', '1719513709219-1d6e405ea017'],
  ['Indoor herb garden kit', 'home', 'kitchen', 29, ['for-the-home', 'for-foodies'], [],
    'Pots, soil and seeds for growing fresh basil, mint and parsley on the windowsill.', 'Home cooks and people without a garden.', 'Dark kitchens without a sunny window.',
    ['Fresh herbs within weeks', 'Kid-friendly project', 'Pretty on a sill'], ['Needs light and regular watering', 'Some kits use small pots'],
    'For the cook who always needs “just a little basil”.', '1553275991-b6ba99f234e1'],
  ['Cheese board and knife set', 'home', 'kitchen', 39, ['for-the-home', 'for-foodies'], [],
    'A wooden serving board with a hidden drawer of cheese knives.', 'Hosts, wine nights and anyone who loves a grazing board.', 'Small kitchens with no storage.',
    ['Everything in one piece', 'Looks great on the table', 'Easy to wipe clean'], ['Hand-wash and oil the wood', 'Bulky to store'],
    'For the host who always brings the cheese.', '1727975399471-1d6f8ce91bbb'],
  ['Suitcase record player with speakers', 'gadgets', 'personal', 69, ['for-tech-lovers'], ['personal'],
    'A portable turntable with built-in speakers — just add vinyl.', 'New vinyl collectors and nostalgia lovers.', 'Audiophiles who want a separate amp and speakers.',
    ['Plays straight out of the box', 'Portable and good-looking', 'Often adds Bluetooth'], ['Built-in speakers are modest', 'Budget tonearms are light on records'],
    'For the music lover who’s been talking about starting a vinyl collection.', '1558584673-c834fb1cc3ca'],
  ['Pour-over coffee set', 'home', 'kitchen', 39, ['for-foodies'], [],
    'A dripper and glass carafe for slow, clean-tasting coffee.', 'Coffee lovers who enjoy the ritual.', 'Anyone who needs coffee in thirty seconds.',
    ['Clean, bright coffee', 'Simple and fun to use', 'Looks lovely on the counter'], ['Takes a few minutes per cup', 'Best with a gooseneck kettle'],
    'For the coffee snob in your life — they’ll love it.', '1610874150308-a1e6f8c905d9'],
  ['Enamelled cast-iron Dutch oven', 'home', 'kitchen', 79, ['for-foodies'], [],
    'The pot for stews, braises and crusty no-knead bread — for decades.', 'Home cooks and weekend bread bakers.', 'Anyone who can’t lift heavy cookware.',
    ['Even, steady heat', 'Stove to oven to table', 'Lasts for decades'], ['Heavy', 'Enamel can chip if dropped'],
    'For the cook who’s ready for their forever pot.', '1770672438590-413eae05e595'],
  ['Chef’s knife', 'home', 'kitchen', 59, ['for-foodies'], [],
    'One sharp, balanced 8-inch knife that handles most kitchen jobs.', 'Anyone still cooking with a blunt knife.', 'People who won’t hand-wash or sharpen a knife.',
    ['Makes prep faster and safer', 'Comfortable, balanced handle', 'Holds an edge'], ['Needs hand-washing', 'Occasional sharpening'],
    'For the friend still chopping onions with a blunt knife.', '1615063053421-e8cd1d71d5f2'],
  ['Hand cream gift set', 'home', null, 19, ['stocking-stuffers', 'for-her'], ['under-25'],
    'A trio of travel-size hand creams for the bag, the desk and the bedside.', 'Anyone with dry winter hands.', 'Very sensitive skin — check the ingredients.',
    ['Three sizes for three places', 'Easy, safe gift', 'Light, non-greasy formulas'], ['Scents are personal', 'Small tubes run out'],
    'For dry winter hands — a small treat for anyone on your list.', '1622875665247-aefc5192dba2'],
];

// Photo replacements: slug → [current catalog photo, replacement]. Applied only
// while the product still shows the current catalog photo.
const PHOTO_FIXES = {
  'sunrise-alarm-clock-with-sound-machine': ['1774185644992-17b445c938e6', '1604258762076-f414c7f78c86'],
  'weighted-blanket-15-lb': ['1688384452844-8364c3e2fc28', '1656944850559-67bb7a03db43'],
  'e-reader-with-front-light': ['1630343710506-89f8b9f21d31', '1591719675150-a9302a9cb467'],
  '3-in-1-charging-stand': ['1649030612217-05ce00752236', '1789691925521-a0867031b263'],
  'slim-card-wallet': ['1613243555988-441166d4d6fd', '1601592996763-f05c9c80a7f1'],
  'silk-pillowcase': ['1629949009765-40fc74c9ec21', '1620770511161-f36f500b60cd'],
  '20-000-mah-usb-c-power-bank': ['1557767382-97b28f5488e7', '1566554738544-d962991c3fee'],
  'compact-cordless-screwdriver': ['1611908200005-b898ddde09cf', '1659456553304-fc4bce847941'],
  'open-ear-sport-earbuds': ['1758520706103-41d01f815640', '1636100007422-4d77bdd15a6b'],
  'mens-field-jacket': ['1675877879221-871aa9f7c314', '1594587639708-095eb3778067'],
  'mens-chelsea-boots': ['1608256246200-53e635b5b65f', '1777987601677-3059be0e1388'],
  'vertical-ergonomic-mouse': ['1487017159836-4e23ece2e4cf', '1625750188088-f6cd6756349c'],
  'usb-c-docking-station': ['1763161786687-43d0c9babdf0', '1777861845988-1914a1588676'],
  'full-length-mirror': ['1556020685-ae41abfc9365', '1787421295573-d99b4b43cf25'],
};

// Cross-listings that put a product in a section it doesn't belong to.
const REMOVE_TAGS = {
  'quiet-tower-fan': ['power-outage'], // needs mains power — no use in an outage
  'one-step-hair-dryer-brush': ['women'], // a styling tool, not fashion
  'full-length-mirror': ['women'],
  'beard-and-body-trimmer': ['men'],
};

// Lead order across the guide (each section shows its picks in this order).
const GIFT_ORDER = [
  'satin-pyjama-set', 'over-ear-noise-cancelling-headphones', 'mens-minimalist-leather-strap-watch', 'pour-over-coffee-set',
  'hand-cream-gift-set', 'hand-poured-scented-candle', 'gold-heart-pendant-necklace', 'leather-wash-bag',
  'instant-print-camera', 'enamelled-cast-iron-dutch-oven', 'ceramic-bud-vase-set', 'gold-hoop-earrings',
  'structured-leather-tote-bag', 'whisky-glass-set-with-chilling-stones', 'suitcase-record-player-with-speakers', 'chefs-knife',
  'waffle-knit-bathrobe', 'pink-satin-lined-ribbed-beanie', 'gold-cross-body-bag', 'slim-card-wallet',
  'e-reader-with-front-light', 'electric-gooseneck-kettle-with-temperature-control', 'weighted-blanket-15-lb', 'silk-pillowcase',
  'wooden-jewellery-box', 'leather-valet-tray', 'smartwatch', 'cheese-board-and-knife-set',
  'sunrise-alarm-clock-with-sound-machine', 'electric-wine-opener', 'colourful-womens-lightweight-scarf-celestial-moon-print', 'mens-merino-crewneck-sweater',
  'wireless-earbuds-with-charging-case', 'handheld-milk-frother', 'heated-throw-blanket', 'contoured-sleep-mask',
  'weekender-duffel-bag', 'waterproof-bluetooth-speaker', 'temperature-control-smart-mug', 'indoor-herb-garden-kit',
  'black-sparkle-phone-pocket-bag', 'leather-belt', '3-in-1-charging-stand', 'champagne-flutes-set-of-4',
];

// Cross-list existing pieces into the new Home sections so they open well stocked.
const ADD_TAGS = {
  'heated-throw-blanket': ['living'],
  'ultrasonic-essential-oil-diffuser': ['living'],
  'champagne-flutes-set-of-4': ['kitchen'],
  'electric-gooseneck-kettle-with-temperature-control': ['kitchen'],
};

// The "vertical" mouse photo shows a sculpted ergonomic mouse; name it for what's pictured.
const RENAMES = { 'vertical-ergonomic-mouse': 'Ergonomic wireless mouse' };

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function categoryId(client, slug, parentSlug = null) {
  const { rows } = parentSlug
    ? await client.query('select c.id from categories c join categories p on p.id = c.parent_id where c.slug = $1 and p.slug = $2', [slug, parentSlug])
    : await client.query('select id from categories where slug = $1 and parent_id is null', [slug]);
  return rows[0]?.id ?? null;
}

async function ensureChild(client, parentId, [slug, name, description, image], sortOrder) {
  await client.query(
    `insert into categories (name, slug, parent_id, description, image_url, image_alt, sort_order, active)
     values ($1, $2, $3, $4, $5, $1, $6, true)
     on conflict (slug) do nothing`,
    [name, slug, parentId, description, image, sortOrder],
  );
}

export async function up(client) {
  const giftsId = await categoryId(client, 'gifts');
  if (!giftsId) return; // fresh database: the seed creates content and runs this afterwards

  // 1. Gift guide structure.
  await client.query(
    `update categories set layout = 'guide', image_url = '/media/gifts-unwrap.mp4',
            image_alt = 'Hands untying the ribbon on a burgundy gift box',
            intro = 'Organised by who you’re buying for. Every pick is something they’ll still be using long after the paper’s gone.'
      where id = $1`,
    [giftsId],
  );
  for (const [i, r] of RECIPIENTS.entries()) await ensureChild(client, giftsId, r, i + 1);

  const homeId = await categoryId(client, 'home');
  if (homeId) for (const [i, c] of HOME_SUBCATEGORIES.entries()) await ensureChild(client, homeId, c, i + 2);

  // 2. New products (skipped when the slug already exists).
  for (const [name, cat, sub, price, recipients, extraTags, short, bestFor, notFor, pros, cons, giftNote, photo] of NEW_PRODUCTS) {
    const slug = slugify(name);
    if ((await client.query('select 1 from products where slug = $1', [slug])).rowCount) continue;
    const catId = await categoryId(client, cat);
    if (!catId) continue;
    const subId = sub ? await categoryId(client, sub, cat) : null;
    const { rows } = await client.query(
      `insert into products (name, slug, short_description, description, category_id, subcategory_id, amazon_url,
                             current_price, price_display, price_source, price_checked_at, pros, cons, best_for,
                             not_for, gift_note, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Estimate — not shown publicly', now(), $10, $11, $12, $13, $14, $15)
       returning id`,
      [name, slug, short, `${short} ${bestFor}`, catId, subId, amazonSearch(name), price, `$${price}`,
        JSON.stringify(pros), JSON.stringify(cons), bestFor, notFor, giftNote, ['gifts', ...recipients, ...extraTags]],
    );
    await client.query('insert into product_images (product_id, url, alt, credit) values ($1, $2, $3, $4)',
      [rows[0].id, U(photo), name, 'Photo: Unsplash']);
  }

  // 3. Curate existing products: picks get recipients + gift notes; everything
  //    else drops out of Gifts (seasonal and other tags are left alone).
  const recipientSlugs = RECIPIENTS.map(([s]) => s);
  for (const [slug, [recipients, note]] of Object.entries(PICKS)) {
    await client.query(
      `update products
          set tags = (select array_agg(distinct t) from unnest(tags || $2::text[]) t),
              gift_note = coalesce(gift_note, $3), updated_at = now()
        where slug = $1`,
      [slug, ['gifts', ...recipients], note],
    );
  }
  for (const [i, slug] of GIFT_ORDER.entries()) {
    await client.query('update products set gift_rank = coalesce(gift_rank, $2) where slug = $1', [slug, i + 1]);
  }
  const keep = [...Object.keys(PICKS), ...NEW_PRODUCTS.map(([name]) => slugify(name))];
  await client.query(
    `update products
        set tags = (select coalesce(array_agg(t), '{}') from unnest(tags) t where t <> 'gifts' and t <> all($2::text[])),
            updated_at = now()
      where 'gifts' = any(tags) and not (slug = any($1::text[]))`,
    [keep, recipientSlugs],
  );

  // 4. Section fixes and photo replacements elsewhere on the site.
  for (const [slug, tags] of Object.entries(REMOVE_TAGS)) {
    await client.query(
      `update products set tags = (select coalesce(array_agg(t), '{}') from unnest(tags) t where t <> all($2::text[])), updated_at = now()
        where slug = $1`,
      [slug, tags],
    );
  }
  for (const [slug, tags] of Object.entries(ADD_TAGS)) {
    await client.query(
      `update products set tags = (select array_agg(distinct t) from unnest(tags || $2::text[]) t), updated_at = now() where slug = $1`,
      [slug, tags],
    );
  }
  for (const [slug, [from, to]] of Object.entries(PHOTO_FIXES)) {
    await client.query(
      `update product_images i set url = $3, credit = 'Photo: Unsplash'
         from products p
        where p.id = i.product_id and p.slug = $1 and i.url = $2`,
      [slug, U(from), U(to)],
    );
  }
  for (const [slug, name] of Object.entries(RENAMES)) {
    await client.query(`update products set name = $2, updated_at = now() where slug = $1 and name <> $2`, [slug, name]);
    await client.query(`update product_images i set alt = $2 from products p where p.id = i.product_id and p.slug = $1`, [slug, name]);
  }
}
