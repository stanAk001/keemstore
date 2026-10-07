// Content: brings every trend page up to about ten picks — new products where
// the trend needed them, plus existing products that fit it.
//
// Safe on any database: products are matched by slug (never duplicated) and
// anything whose category is missing is skipped.
const photo = (ref) => `https://images.pexels.com/photos/${ref.slice(1)}/pexels-photo-${ref.slice(1)}.jpeg`;
const amazonSearch = (name) => `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// [name, category, subcategory, approx price, tags, short, best for, not for, pros, cons, photo]
const PRODUCTS = [
  // Eyeliners
  ['Lengthening mascara', 'beauty', 'makeup', 14, ['eyeliners', 'under-25'],
    'Separates and lengthens lashes without clumps — the finishing touch for any liner look.', 'Everyday wear and short, straight lashes.', 'Anyone who needs fully waterproof wear.',
    ['Defined, fluttery lashes', 'Buildable', 'Easy to remove'], ['Can flake late in the day', 'Replace every three months'], 'P4938457'],
  ['Eyelash curler', 'beauty', 'makeup', 12, ['eyeliners', 'under-25'],
    'A few seconds of curl that opens up the eyes before mascara.', 'Straight or downward-pointing lashes.', 'Lash extensions.',
    ['Instantly brighter eyes', 'Lasts for years', 'Cheap'], ['Replace the pad now and then', 'Takes a little practice'], 'P7588612'],
  ['Neutral eyeshadow palette', 'beauty', 'makeup', 24, ['eyeliners', 'under-25'],
    'Wearable browns and taupes for soft definition or a smoky base under liner.', 'Everyday makeup and beginners.', 'Bold colour lovers.',
    ['Flattering on most skin tones', 'Matte and shimmer mix', 'Built-in mirror on many'], ['Neutrals only', 'Powder shades can kick up'], 'P4774061'],
  ['Lighted vanity mirror', 'beauty', 'makeup', 39, ['eyeliners'],
    'Even, adjustable light so liner and brows come out symmetrical.', 'Dim bathrooms and detailed makeup.', 'Small counters — check the size.',
    ['No more uneven liner', 'Dimmable light', 'Magnifying side on many'], ['Needs a socket or charging', 'Bulky'], 'P1932665'],
  // Skincare
  ['Hydrating face mist', 'beauty', 'skincare', 16, ['face-lotions-creams', 'serums-essences', 'under-25'],
    'A fine spray that refreshes skin and sets makeup.', 'Dry offices, flights and midday touch-ups.', 'Anyone expecting it to replace moisturiser.',
    ['Instant refresh', 'Sets makeup', 'Travel-friendly'], ['Effect is short-lived', 'Some contain fragrance'], 'P7321279'],
  ['Rose quartz gua sha and roller set', 'beauty', 'skincare', 22, ['serums-essences', 'under-25'],
    'Massage tools that help serums glide in and leave skin looking less puffy.', 'Morning puffiness and relaxing routines.', 'Active breakouts.',
    ['Feels calming', 'Helps products spread', 'Looks lovely on a shelf'], ['Results are temporary', 'Wash after each use'], 'P6963143'],
  ['Men’s daily moisturiser', 'beauty', 'skincare', 18, ['facial-moisturizers', 'under-25'],
    'A light, fast-absorbing moisturiser that also soothes after shaving.', 'Men starting a simple routine.', 'Very dry skin.',
    ['Non-greasy', 'Calms razor burn', 'One-step routine'], ['Basic formula', 'Scent varies'], 'P8159665'],
  ['Hydrating lip balm', 'beauty', 'skincare', 8, ['facial-moisturizers', 'under-25'],
    'A nourishing balm for dry, cold-weather lips.', 'Winter, flights and overnight lip care.', 'Anyone wanting colour.',
    ['Soothes chapped lips', 'Pocket-sized', 'Cheap'], ['Reapply often', 'Easy to lose'], 'P8129909'],
  // Bath & body
  ['Whipped body butter', 'beauty', 'bath-body', 18, ['body-washes', 'under-25'],
    'A rich, airy cream that seals in moisture after the shower.', 'Dry skin and winter evenings.', 'Hot, humid weather.',
    ['Deeply moisturising', 'A little goes a long way', 'Lovely texture'], ['Takes a minute to sink in', 'Jar packaging'], 'P4735910'],
  ['Bath bomb gift set', 'beauty', 'bath-body', 22, ['body-washes', 'gifts', 'under-25'],
    'Fizzing, scented bath bombs for a slow evening soak.', 'Bath lovers and easy gifts.', 'Sensitive skin — choose fragrance-free.',
    ['Instant spa feel', 'Great gift', 'Relaxing'], ['Single use', 'Some colour the tub'], 'P7924189'],
  ['Mineral bath salts', 'beauty', 'bath-body', 16, ['body-washes', 'under-25'],
    'Soothing salts with dried flowers for tired muscles.', 'After workouts and long days.', 'Showers only.',
    ['Relaxing soak', 'Pretty jar', 'Lasts several baths'], ['Needs a bathtub', 'Can stain light grout if dyed'], 'P20862412'],
  // Hair
  ['Satin bonnet and scrunchie set', 'beauty', 'hair', 15, ['hair-combs', 'under-25'],
    'Protects curls and blow-outs overnight and reduces frizz.', 'Curly, coily and blow-dried hair.', 'Anyone who dislikes wearing something to bed.',
    ['Less frizz and breakage', 'Keeps styles longer', 'Matching scrunchies'], ['Can slip off at night', 'Hand-wash'], 'P7897135'],
  ['Hair claw clips', 'beauty', 'hair', 12, ['hair-combs', 'under-25'],
    'Tortoiseshell claw clips for a two-second twist-up.', 'Thick hair and quick updos.', 'Very fine, short hair.',
    ['Fast and secure', 'Kinder than elastics', 'Looks polished'], ['Big clips are hard to lean back on', 'Can snap if dropped'], 'P20166053'],
  ['Heatless foam curlers', 'beauty', 'hair', 12, ['hair-combs', 'under-25'],
    'Soft overnight rollers for bouncy curls without heat damage.', 'Anyone avoiding curling irons.', 'Very short hair.',
    ['No heat damage', 'Comfortable to sleep in', 'Cheap'], ['Takes practice', 'Needs hours to set'], 'P5240299'],
  ['Microfibre hair towel wrap', 'beauty', 'hair', 14, ['hair-combs', 'body-washes', 'under-25'],
    'A light turban that dries hair faster with less frizz.', 'Long, curly or frizz-prone hair.', 'Anyone who prefers air-drying.',
    ['Cuts drying time', 'Less frizz than cotton', 'Stays put'], ['Small for very long hair', 'Wash often'], 'P4946942'],
  // Garden
  ['Raised garden bed', 'home', 'garden', 79, ['gardening-tools'],
    'A wooden planter bed for vegetables and herbs with less bending.', 'Patios, small gardens and poor soil.', 'Renters who can’t move it easily.',
    ['Better drainage', 'Easier on the back', 'Tidy look'], ['Needs a lot of soil', 'Wood weathers'], 'P11573791'],
  ['Hose spray nozzle', 'home', 'garden', 15, ['gardening-tools', 'under-25'],
    'Several spray patterns, from mist for seedlings to jet for patios.', 'Every garden hose.', 'Drip irrigation setups.',
    ['Versatile patterns', 'Saves water', 'Cheap upgrade'], ['Metal ones get cold', 'Check the fitting size'], 'P4870743'],
  ['Terracotta plant pots, set of 6', 'home', 'garden', 29, ['gardening-tools'],
    'Classic breathable clay pots with drainage holes.', 'Herbs, succulents and windowsill plants.', 'Thirsty plants in hot sun — clay dries fast.',
    ['Healthy roots', 'Timeless look', 'Stackable'], ['Breakable', 'Dries out quickly'], 'P9057700'],
  // Fireplace
  ['Wicker log basket', 'home', 'living', 39, ['fireplace-accessories'],
    'A sturdy woven basket that keeps logs tidy by the hearth.', 'Wood burners and cosy living rooms.', 'Damp wood — it needs drying first.',
    ['Looks lovely', 'Handles for carrying', 'Doubles as blanket storage'], ['Bark falls through', 'Wicker can snag'], 'P36717641'],
  ['Natural fire starters', 'home', 'living', 12, ['fireplace-accessories', 'under-25'],
    'Wood-wool firelighters that catch fast without chemical smells.', 'Fireplaces, stoves and fire pits.', 'Gas fires.',
    ['Lights first time', 'No paraffin smell', 'Cheap'], ['Single use', 'Keep dry'], 'P6667199'],
  // Costumes
  ['Cat ears headband', 'seasonal-finds', null, 8, ['costumes-accessories', 'halloween', 'under-25'],
    'The easiest costume there is — add eyeliner whiskers and you’re done.', 'Kids, adults and last-minute parties.', 'Anyone wanting a full costume.',
    ['Comfortable', 'Works with any outfit', 'Very cheap'], ['Simple', 'Can pinch after hours'], 'P7140763'],
  ['Kids’ superhero cape and mask', 'seasonal-finds', null, 16, ['costumes-accessories', 'halloween', 'under-25'],
    'A satin cape and eye mask for endless dress-up, not just Halloween.', 'Kids aged 3–8 and dress-up boxes.', 'Teens and adults.',
    ['Year-round play', 'Velcro fastening', 'Machine washable'], ['One size', 'Thin fabric'], 'P6800574'],
  ['Butterfly fairy wings', 'seasonal-finds', null, 18, ['costumes-accessories', 'halloween', 'under-25'],
    'Shimmering wings with elastic straps for fairies and butterflies.', 'Kids’ costumes and parties.', 'Crowded spaces — they’re wide.',
    ['Instant costume', 'Lightweight', 'Fold for storage'], ['Fragile', 'Straps can dig in'], 'P15805490'],
  // Seasonal decor & wreaths
  ['Decorative faux pumpkins, set of 3', 'seasonal-finds', null, 24, ['seasonal-decorations', 'fall', 'thanksgiving', 'under-25'],
    'Realistic pumpkins that won’t rot — out every autumn.', 'Mantels, porches and Thanksgiving tables.', 'Carving.',
    ['Reusable', 'Lightweight', 'Neutral colours'], ['Not real', 'Store away from heat'], 'P34958091'],
  ['Felt autumn leaf garland', 'home', 'living', 18, ['wreaths-garlands', 'fall', 'under-25'],
    'Soft felt leaves in rust, sage and plum for mantels and doorways.', 'Autumn decorating and kids’ rooms.', 'Outdoor use in the rain.',
    ['Warm, cosy look', 'Reusable', 'Easy to hang'], ['Indoor only', 'Can fade in sun'], 'P1389460'],
  ['White dried-flower door wreath', 'home', 'living', 39, ['wreaths-garlands', 'fall'],
    'Bleached grasses and pampas in a soft, airy wreath that works all year.', 'Neutral front doors and boho interiors.', 'Exposed, rainy doors.',
    ['Year-round style', 'Light and easy to hang', 'No upkeep'], ['Delicate', 'Keep out of the rain'], 'P6232495'],
  ['Battery fairy lights', 'home', 'living', 14, ['wreaths-garlands', 'seasonal-decorations', 'under-25'],
    'Fine copper-wire lights to weave through wreaths, jars and garlands.', 'Wreaths, mantels and table centrepieces.', 'Large outdoor displays.',
    ['No socket needed', 'Timer on many', 'Warm glow'], ['Batteries run down', 'Thin wire tangles'], 'P16343005'],
  // Figurines
  ['Wooden safari animal figurines', 'home', 'living', 24, ['figurines', 'under-25'],
    'Hand-carved giraffe, elephant and croc for shelves or a nursery.', 'Nurseries, bookshelves and gifts.', 'Toddlers who chew everything.',
    ['Warm natural wood', 'Playful', 'Sturdy'], ['Small', 'Finish varies'], 'P3661223'],
  ['Wooden elephant family figurines', 'home', 'living', 26, ['figurines'],
    'A smooth, chunky elephant trio in warm wood.', 'Minimal shelves and kids’ rooms.', 'Anyone wanting colourful decor.',
    ['Calm, simple design', 'Lasts for years', 'Gift-ready'], ['Heavy for floating shelves', 'Wood can crack in dry air'], 'P6219057'],
  ['Marble bookends', 'home', 'living', 34, ['figurines'],
    'Heavy marble half-moons that hold books upright in style.', 'Bookshelves and desks.', 'Shelves that can’t take weight.',
    ['Really holds books', 'Looks expensive', 'Felt base'], ['Heavy', 'Marble chips if dropped'], 'P4207795'],
  ['Christmas village houses', 'home', 'living', 29, ['figurines', 'seasonal-decorations', 'christmas'],
    'Little ceramic houses for a snowy mantel village.', 'Christmas mantels and collectors.', 'Modern minimalist decor.',
    ['Charming and nostalgic', 'Collectable', 'Some light up'], ['Seasonal', 'Fragile'], 'P23338546'],
  // Bakeware
  ['Wire cooling rack', 'home', 'kitchen', 14, ['bakeware', 'under-25'],
    'Lets cookies and cakes cool without going soggy underneath.', 'Every baker.', 'Anyone short on counter space — get a stackable one.',
    ['Crisp bottoms', 'Doubles as an oven rack for roasting', 'Cheap'], ['Hard to wash the grid', 'Cheap ones rust'], 'P11799020'],
  ['Stainless steel mixing bowls', 'home', 'kitchen', 25, ['bakeware'],
    'Nesting bowls in three sizes for batters, doughs and salads.', 'Bakers and meal-preppers.', 'Microwave use.',
    ['Light and unbreakable', 'Nest to save space', 'Dishwasher safe'], ['Not microwave-safe', 'Can be noisy'], 'P8178898'],
  ['Wooden rolling pin', 'home', 'kitchen', 16, ['bakeware', 'under-25'],
    'A smooth hardwood pin for pastry, cookies and pizza.', 'Pie and cookie bakers.', 'Very sticky dough — chill it first.',
    ['Even rolling', 'Lasts forever', 'Cheap'], ['Hand-wash only', 'Needs flour to stop sticking'], 'P6287325'],
  ['Round cake pans, set of 2', 'home', 'kitchen', 22, ['bakeware', 'under-25'],
    'Two 9-inch pans for layer cakes and cheesecakes.', 'Birthday cakes and holiday baking.', 'Bundt or tall cakes.',
    ['Even baking', 'Layer cakes made easy', 'Non-stick'], ['Use parchment for release', 'Coating wears over time'], 'P14806243'],
  // Crockpot dinners
  ['Stainless steel stockpot', 'home', 'kitchen', 49, ['crockpot-dinners'],
    'A big pot for soups, stocks and batch cooking.', 'Families and meal-preppers.', 'Small kitchens with little storage.',
    ['Big capacity', 'Works on induction', 'Lasts for years'], ['Bulky', 'Heavy when full'], 'P39953035'],
  ['Ceramic casserole dish', 'home', 'kitchen', 32, ['crockpot-dinners', 'bakeware'],
    'Oven-to-table dish for bakes, lasagne and gratins.', 'Weeknight bakes and potlucks.', 'Stovetop cooking.',
    ['Goes straight to the table', 'Even heat', 'Easy to clean'], ['Heavy', 'Can crack with sudden temperature changes'], 'P32039641'],
  ['Silicone cooking utensil set', 'home', 'kitchen', 24, ['crockpot-dinners', 'under-25'],
    'Spatulas, spoons and a ladle that are safe on non-stick.', 'Anyone with non-stick or slow-cooker pots.', 'Cooks who prefer wooden tools.',
    ['Won’t scratch pans', 'Heat-resistant', 'Dishwasher safe'], ['Can stain with tomato', 'Handles vary'], 'P38848780'],
  ['Wooden cutting boards, set of 2', 'home', 'kitchen', 29, ['crockpot-dinners', 'bakeware'],
    'Sturdy boards for chopping and serving.', 'Every kitchen.', 'Raw meat prep — use a separate plastic board.',
    ['Kind to knife edges', 'Doubles as a serving board', 'Good-looking'], ['Hand-wash and oil', 'Can warp if soaked'], 'P33937886'],
  // Gaming
  ['RGB gaming mouse', 'gadgets', null, 39, ['gaming-room-setups'],
    'A light, precise mouse with programmable buttons and lighting.', 'PC gamers and fast-paced games.', 'Small hands — check the size.',
    ['Accurate sensor', 'Extra buttons', 'Customisable lighting'], ['Software can be clunky', 'Cable or charging to manage'], 'P1644557'],
  ['Headphone stand', 'gadgets', null, 19, ['gaming-room-setups', 'under-25'],
    'Keeps headsets off the desk and in easy reach.', 'Desks with big over-ear headphones.', 'Earbud users.',
    ['Tidier desk', 'Protects the headband', 'Cheap'], ['Takes desk space', 'Light stands can tip'], 'P30836158'],
  // Boots
  ['Leather cowboy boots', 'fashion', null, 149, ['boots', 'men', 'women'],
    'Classic western boots that work with denim and dresses alike.', 'Western-inspired outfits and festival season.', 'Long walks on day one — break them in.',
    ['Statement style', 'Durable leather', 'Easy pull-on'], ['Break-in period', 'Narrow fit on many'], 'P14759054'],
  ['Classic rain boots', 'fashion', null, 59, ['boots', 'men', 'women'],
    'Tall waterproof wellies for puddles, mud and dog walks.', 'Rainy commutes, gardening and festivals.', 'Long walks — add cushioned socks.',
    ['Fully waterproof', 'Easy to clean', 'Long-lasting'], ['Hot in summer', 'Not much support'], 'P7462723'],
  ['Waterproof hiking boots', 'fashion', null, 119, ['boots', 'men', 'women'],
    'Supportive, grippy boots for trails and wet autumn walks.', 'Weekend hikes and country walks.', 'City outfits.',
    ['Ankle support', 'Waterproof membrane', 'Grippy sole'], ['Heavier than trainers', 'Break-in needed'], 'P10781162'],
  // Coats & outerwear
  ['Women’s camel wrap coat', 'fashion', 'women', 139, ['coats-jackets', 'women', 'fall'],
    'A belted camel coat — the most versatile coat a woman can own.', 'Workwear and smart weekends.', 'Rainy climates without an umbrella.',
    ['Timeless', 'Flattering belt', 'Goes with everything'], ['Shows marks', 'Dry-clean only on many'], 'P19169192'],
  ['Men’s bomber jacket', 'fashion', 'men', 79, ['coats-jackets', 'men'],
    'A light, padded bomber with ribbed cuffs for in-between weather.', 'Autumn and spring layering.', 'Proper winter cold.',
    ['Easy, casual style', 'Light warmth', 'Packs flat'], ['Not waterproof', 'Short cut won’t suit everyone'], 'P16069733'],
  ['Women’s teddy coat', 'fashion', 'women', 89, ['outerwear', 'women'],
    'A plush, oversized teddy coat that feels like a hug.', 'Casual winter outfits.', 'Rain — it soaks up water.',
    ['Very cosy', 'On-trend', 'Relaxed fit'], ['Bulky', 'Pills over time'], 'P10295887'],
  ['Insulated ski jacket', 'fashion', null, 179, ['outerwear', 'men', 'women'],
    'A waterproof, insulated jacket with a powder skirt and hood.', 'Ski trips and snowy winters.', 'City commuting.',
    ['Warm and waterproof', 'Lots of pockets', 'Bright colours for visibility'], ['Sporty look', 'Pricey'], 'P9562775'],
  ['Packable down vest', 'fashion', null, 69, ['outerwear', 'men', 'women'],
    'A light quilted vest that keeps your core warm under a coat or on its own.', 'Layering, travel and autumn walks.', 'Freezing days on its own.',
    ['Light warmth', 'Packs into a pocket', 'Easy to layer'], ['Arms stay cold', 'Down needs care when washing'], 'P6147124'],
  // Suits
  ['Cufflinks gift box', 'fashion', 'men', 25, ['suits', 'men', 'under-25'],
    'Polished cufflinks that finish a French-cuff shirt.', 'Weddings, groomsmen and formal events.', 'Button-cuff shirts.',
    ['Instant polish', 'Gift-ready box', 'Classic designs'], ['Needs French cuffs', 'Easy to lose'], 'P3868949'],
  ['Men’s tailored waistcoat', 'fashion', 'men', 49, ['suits', 'men'],
    'A fitted waistcoat that turns trousers and a shirt into a sharp look.', 'Weddings and three-piece suits.', 'Very casual dress codes.',
    ['Smart with or without a jacket', 'Adjustable back', 'Slimming'], ['Sizing matters', 'Dry-clean'], 'P19383843'],
  // Slippers
  ['Cosy knit lounge socks', 'fashion', null, 15, ['slippers', 'fireplace-accessories', 'under-25'],
    'Thick, soft socks for curling up by the fire.', 'Cold floors and lazy Sundays.', 'Hardwood stairs — they’re slippery.',
    ['Very warm', 'Great stocking filler', 'Machine washable'], ['Slippery on wood', 'Can pill'], 'P6660713'],
  ['Open-toe spa slides', 'fashion', null, 18, ['slippers', 'under-25'],
    'Light, hotel-style slides for after the bath or shower.', 'Spa days at home and guest rooms.', 'Cold weather.',
    ['Easy on and off', 'Light', 'Hotel feel'], ['Thin sole', 'Not very warm'], 'P9267584'],
  ['Pink faux-fur slippers', 'fashion', 'women', 24, ['slippers', 'women', 'under-25'],
    'Fluffy closed-toe slippers in blush pink — pure comfort.', 'Cold floors and cosy gifts.', 'Outdoor trips to the bin.',
    ['Very soft and warm', 'Cute gift', 'Cushioned sole'], ['Indoor only', 'Fluff sheds a little at first'], 'P6633324'],
  ['Plush open-toe house slippers', 'fashion', 'women', 22, ['slippers', 'women', 'under-25'],
    'Cloud-soft slides that work over socks on chilly mornings.', 'Lounging and morning coffee.', 'Anyone needing arch support.',
    ['Wear with or without socks', 'Light', 'Machine washable'], ['Little support', 'Toes stay cool'], 'P6633373'],
  ['Men’s leather house moccasins', 'fashion', 'men', 49, ['slippers', 'men'],
    'Soft leather moccasins that mould to your feet.', 'Men who want a smarter slipper.', 'Outdoor use.',
    ['Comfortable and breathable', 'Smart enough for guests', 'Lasts years'], ['Not very warm', 'Leather needs care'], 'P26861951'],
  // Oxfords & loafers
  ['Women’s horsebit loafers', 'fashion', 'women', 69, ['oxfords-loafers', 'women'],
    'Soft loafers with a gold horsebit — polished but comfortable.', 'Office wear and smart weekends.', 'Wide feet — check the fit.',
    ['Classic detail', 'Comfortable flat', 'Goes with trousers and skirts'], ['Sizing varies', 'Leather needs breaking in'], 'P14706988'],
  ['Women’s croc-effect loafers', 'fashion', 'women', 65, ['oxfords-loafers', 'women'],
    'Embossed croc-effect loafers with a slim buckle — easy polish for workdays.', 'Office wear and cropped trousers.', 'Rainy days.',
    ['Polished look', 'Comfortable flat', 'Neutral colour'], ['Embossing can scuff', 'Sizing varies'], 'P27141835'],
  ['Men’s double monk strap shoes', 'fashion', 'men', 129, ['oxfords-loafers', 'men', 'suits'],
    'Buckled dress shoes with more character than an oxford.', 'Suits, chinos and smart-casual offices.', 'Very formal black-tie events.',
    ['Distinctive but classic', 'No laces', 'Works with suits'], ['Buckles can scuff', 'Pricier'], 'P5336942'],
  ['Leather driving moccasins', 'fashion', 'men', 79, ['oxfords-loafers', 'men'],
    'Soft, flexible moccasins with a grippy pebble sole.', 'Summer to autumn, travel and smart-casual weekends.', 'Rain and long walks.',
    ['Very comfortable', 'Light and packable', 'Easy slip-on'], ['Sole wears faster', 'Not for wet weather'], 'P27256413'],
];

// Existing products that belong on more trend pages.
const CROSS_LIST = {
  'gel-cream-moisturiser': ['face-lotions-creams'],
  'oil-free-daily-moisturiser': ['face-lotions-creams'],
  'tinted-moisturiser-with-spf': ['face-lotions-creams'],
  'hand-cream-gift-set': ['face-lotions-creams'],
  'ceramide-barrier-repair-cream': ['serums-essences'],
  'overnight-sleeping-mask': ['serums-essences', 'facial-moisturizers'],
  'daily-face-lotion-with-spf-30': ['facial-moisturizers'],
  'waffle-knit-bathrobe': ['body-washes'],
  'indoor-herb-garden-kit': ['gardening-tools'],
  'smart-sprinkler-controller': ['gardening-tools'],
  'hand-poured-scented-candle': ['fireplace-accessories'],
  'pine-garland-9-ft': ['fireplace-accessories'],
  'warm-white-christmas-string-lights': ['wreaths-garlands'],
  'glass-christmas-bauble-set': ['wreaths-garlands'],
  'ceramic-bud-vase-set': ['figurines'],
  'chefs-knife': ['crockpot-dinners'],
  'ballet-flats': ['oxfords-loafers'],
};

async function categoryId(client, slug, parentSlug) {
  const { rows } = parentSlug
    ? await client.query('select c.id from categories c join categories p on p.id = c.parent_id where c.slug = $1 and p.slug = $2', [slug, parentSlug])
    : await client.query('select id from categories where slug = $1 and parent_id is null', [slug]);
  return rows[0]?.id ?? null;
}

export async function up(client) {
  for (const [name, cat, sub, price, tags, short, bestFor, notFor, pros, cons, image] of PRODUCTS) {
    const slug = slugify(name);
    if ((await client.query('select 1 from products where slug = $1', [slug])).rowCount) continue;
    const catId = await categoryId(client, cat);
    if (!catId) continue;
    const subId = sub ? await categoryId(client, sub, cat) : null;
    const { rows } = await client.query(
      `insert into products (name, slug, short_description, description, category_id, subcategory_id, amazon_url,
                             current_price, price_display, price_source, price_checked_at, pros, cons, best_for, not_for, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Estimate — not shown publicly', now(), $10, $11, $12, $13, $14)
       returning id`,
      [name, slug, short, `${short} ${bestFor}`, catId, subId, amazonSearch(name), price, `$${price}`,
        JSON.stringify(pros), JSON.stringify(cons), bestFor, notFor, tags],
    );
    await client.query('insert into product_images (product_id, url, alt, credit) values ($1, $2, $3, $4)',
      [rows[0].id, photo(image), name, 'Photo: Pexels']);
  }
  for (const [slug, tags] of Object.entries(CROSS_LIST)) {
    await client.query(
      `update products set tags = (select array_agg(distinct t) from unnest(tags || $2::text[]) t), updated_at = now() where slug = $1`,
      [slug, tags],
    );
  }
}
