// Content: this month's Pinterest shopping trends (US, read 2 Oct 2026) and two
// fast-growing searches, each with its own trend page and hand-picked products.
// Adds a Beauty section (Makeup, Skincare, Bath & Body, Hair) and Home → Garden.
//
// Safe on any database: everything is matched by slug and skipped when what it
// depends on is missing. Re-running never duplicates products or trends, and a
// trend's figures are only filled in while they're still empty, so edits made
// in the admin are kept.
const MEASURED_AT = '2026-10-02';

const photo = (ref) => (ref.startsWith('P')
  ? `https://images.pexels.com/photos/${ref.slice(1)}/pexels-photo-${ref.slice(1)}.jpeg`
  : `https://images.unsplash.com/photo-${ref.slice(1)}`);
const credit = (ref) => (ref.startsWith('P') ? 'Photo: Pexels' : 'Photo: Unsplash');
const amazonSearch = (name) => `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- Sections ----------------------------------------------------------------
const BEAUTY = ['beauty', 'Beauty', 'Makeup, skincare and body care people are buying right now — with honest notes on who each one suits.', 'P9775170'];
const BEAUTY_CHILDREN = [
  ['makeup', 'Makeup', 'Eyeliners, brushes and the everyday basics.', 'P8005247'],
  ['skincare', 'Skincare', 'Serums, moisturisers and creams, explained without the jargon.', 'P6635922'],
  ['bath-body', 'Bath & Body', 'Body washes, scrubs and the shower upgrades that feel like a spa.', 'P7262747'],
  ['hair', 'Hair', 'Combs and brushes for every hair type.', 'P28994386'],
];
const HOME_CHILDREN = [
  ['garden', 'Garden & Outdoor', 'Tools that make planting, pruning and watering easier.', 'P3971211'],
];

// ---- Products ----------------------------------------------------------------
// [name, category, subcategory, approx price, tags, short, best for, not for, pros, cons, photo]
const PRODUCTS = [
  // Makeup — eyeliners
  ['Waterproof liquid eyeliner pen', 'beauty', 'makeup', 12, ['eyeliners', 'under-25'],
    'A fine felt tip for crisp wings that last through a long day.', 'Anyone learning winged liner, and oily lids that smudge pencils.', 'Very sensitive eyes — patch test first.',
    ['Precise, easy-to-control tip', 'Smudge- and water-resistant', 'Quick to dry'], ['Tips dry out after a few months', 'Needs an oil-based remover'], 'P7256089'],
  ['Gel eyeliner pot with brush', 'beauty', 'makeup', 18, ['eyeliners', 'under-25'],
    'Creamy gel you can smoke out softly or sharpen into a graphic line.', 'People who like to build intensity and shape.', 'Anyone in a hurry — a pen is quicker.',
    ['Rich, buildable colour', 'Works for soft or sharp looks', 'Long-wearing once set'], ['Brush needs regular cleaning', 'Pot can dry out if left open'], 'P7615173'],
  ['Kohl eyeliner pencil set', 'beauty', 'makeup', 14, ['eyeliners', 'under-25'],
    'Soft pencils that glide on for smudgy, lived-in definition.', 'Waterline lining and quick everyday definition.', 'Super-precise graphic wings.',
    ['Soft and easy to blend', 'Gentle on the waterline', 'Several shades in one set'], ['Can smudge on oily lids', 'Needs sharpening'], 'P2517447'],
  ['Coloured eyeliner set', 'beauty', 'makeup', 22, ['eyeliners', 'under-25'],
    'Teal, green and metallic liners for a pop of colour.', 'Anyone bored of black liner, and party looks.', 'Strictly neutral makeup wearers.',
    ['Easy way to try colour', 'Flattering on most eye colours', 'Fun gift'], ['Shades vary in intensity', 'Bright colours show mistakes'], 'P2693644'],
  ['Angled eyeliner brush set', 'beauty', 'makeup', 16, ['eyeliners', 'under-25'],
    'Fine and angled brushes for gel liner, tightlining and smudging.', 'Gel liner users and anyone who likes control.', 'People who only use pens and pencils.',
    ['Cleaner lines than fingers', 'Soft synthetic bristles', 'Doubles for brows'], ['Needs weekly cleaning', 'Cheap sets shed'], 'P1830447'],
  ['Micellar cleansing water', 'beauty', 'skincare', 12, ['eyeliners', 'under-25'],
    'Lifts eyeliner and makeup without harsh rubbing.', 'Daily makeup wearers and sensitive eyes.', 'Very heavy waterproof makeup — use an oil cleanser.',
    ['Gentle, no rinsing needed', 'Fast end-of-day cleanse', 'Fine for sensitive skin'], ['Waterproof liner may need two passes', 'Uses a lot of cotton pads'], 'P8131576'],
  // Skincare — lotions & creams
  ['Rich night cream', 'beauty', 'skincare', 32, ['face-lotions-creams', 'facial-moisturizers'],
    'A thick, cushiony cream that soaks in overnight.', 'Dry and mature skin, and cold-weather months.', 'Oily or acne-prone skin.',
    ['Deeply nourishing', 'Skin feels soft by morning', 'A little goes a long way'], ['Too heavy for daytime', 'Jars aren’t the most hygienic'], 'U1763503836825-97f5450d155a'],
  ['Daily face lotion with SPF 30', 'beauty', 'skincare', 22, ['face-lotions-creams', 'under-25'],
    'Moisturiser and sun protection in one step.', 'Minimal routines and anyone who skips sunscreen.', 'Long days at the beach — use a dedicated sunscreen.',
    ['Two steps in one', 'Light under makeup', 'Daily sun protection'], ['Must be reapplied for long sun exposure', 'Some leave a slight cast'], 'P16378477'],
  ['Under-eye cream', 'beauty', 'skincare', 28, ['face-lotions-creams'],
    'A gentle cream for the delicate skin around the eyes.', 'Dry or crepey under-eyes.', 'Anyone expecting it to erase dark circles.',
    ['Gentle formula', 'Smooths concealer application', 'Lasts months'], ['Results are subtle', 'Small jar for the price'], 'P16329592'],
  ['Ceramide barrier repair cream', 'beauty', 'skincare', 24, ['face-lotions-creams', 'facial-moisturizers', 'under-25'],
    'Calms tight, irritated skin and rebuilds its natural barrier.', 'Sensitive, dry or over-exfoliated skin.', 'People wanting a weightless gel.',
    ['Soothing and fragrance-free options', 'Pairs well with actives', 'Face and body'], ['Rich texture', 'Plain packaging on most'], 'U1765964492963-b0aa8c172431'],
  ['Overnight sleeping mask', 'beauty', 'skincare', 26, ['face-lotions-creams'],
    'A leave-on mask that seals in moisture while you sleep.', 'Dull, dehydrated skin and pre-event prep.', 'Acne-prone skin on a heavy routine.',
    ['Plump, glowy mornings', 'No rinsing', 'Two or three nights a week is enough'], ['Can transfer to pillows', 'Not a daily step for everyone'], 'P7321497'],
  // Skincare — serums & essences
  ['Vitamin C serum', 'beauty', 'skincare', 25, ['serums-essences'],
    'A morning serum that brightens dull skin and evens out tone.', 'Dull or uneven skin, under daily sunscreen.', 'Very reactive skin — start slowly.',
    ['Visible glow with regular use', 'Pairs well with SPF', 'Lightweight'], ['Oxidises once opened', 'Can tingle at first'], 'P16769670'],
  ['Hyaluronic acid serum', 'beauty', 'skincare', 18, ['serums-essences', 'under-25'],
    'Pulls water into the skin for an instantly plumper look.', 'Every skin type, especially dehydrated skin.', 'Anyone skipping moisturiser — it needs one on top.',
    ['Suits almost everyone', 'Weightless, layers easily', 'Affordable'], ['Apply to damp skin for best results', 'Effect is temporary'], 'P8054400'],
  ['Niacinamide serum', 'beauty', 'skincare', 15, ['serums-essences', 'under-25'],
    'Helps with visible pores, shine and uneven texture.', 'Oily and combination skin.', 'Skin that reacts to many actives.',
    ['Calms redness and shine', 'Works morning or night', 'Very affordable'], ['Can pill under some makeup', 'Results take weeks'], 'P8100775'],
  ['Retinol night serum', 'beauty', 'skincare', 28, ['serums-essences'],
    'A gentle retinol for smoother texture and fine lines.', 'Anyone starting retinol in their late 20s and up.', 'Pregnancy, or very sensitive skin.',
    ['Proven long-term results', 'Gentle starter strength', 'Evenings only'], ['Expect some dryness at first', 'Daily SPF is a must'], 'P8101529'],
  ['Hydrating essence toner', 'beauty', 'skincare', 22, ['serums-essences', 'under-25'],
    'A watery first layer that preps skin to drink up the rest.', 'Dry skin and layered routines.', 'Two-step minimalists.',
    ['Instant softness', 'Helps serums absorb', 'Pleasant ritual'], ['Easy to skip', 'Goes quickly if poured on pads'], 'P13608712'],
  ['Rosehip face oil', 'beauty', 'skincare', 24, ['serums-essences', 'facial-moisturizers'],
    'A few drops seal in moisture and add a healthy glow.', 'Dry skin and winter evenings.', 'Very oily, breakout-prone skin.',
    ['Glowy finish', 'Mixes into moisturiser', 'Lasts months'], ['Can feel greasy if overused', 'Shorter shelf life once opened'], 'P11635426'],
  // Skincare — moisturisers
  ['Gel-cream moisturiser', 'beauty', 'skincare', 22, ['facial-moisturizers'],
    'Bouncy, lightweight hydration that sinks in fast.', 'Normal to combination skin and warm rooms.', 'Very dry skin in winter.',
    ['Sinks in quickly', 'Great under makeup', 'Fresh feel'], ['May not be enough for dry skin', 'Jar packaging'], 'P9774603'],
  ['Oil-free daily moisturiser', 'beauty', 'skincare', 16, ['facial-moisturizers', 'under-25'],
    'A pump-bottle moisturiser that hydrates without shine.', 'Oily and breakout-prone skin.', 'Dry skin that needs richness.',
    ['Matte, non-greasy finish', 'Hygienic pump', 'Affordable'], ['Light on hydration for dry skin', 'Basic packaging'], 'P4736028'],
  ['Tinted moisturiser with SPF', 'beauty', 'skincare', 28, ['facial-moisturizers'],
    'Sheer coverage, hydration and sun protection in one tube.', 'No-makeup makeup and quick mornings.', 'Anyone wanting full coverage.',
    ['Evens skin tone lightly', 'Three steps in one', 'Easy to apply with fingers'], ['Shade range varies by brand', 'Reapply SPF outdoors'], 'P16212411'],
  // Bath & body
  ['Moisturising body wash', 'beauty', 'bath-body', 12, ['body-washes', 'under-25'],
    'A creamy, low-foam wash that leaves skin soft, not tight.', 'Dry skin and long hot showers.', 'People who love lots of lather.',
    ['Gentle on skin', 'Pleasant, light scent', 'Big bottles last'], ['Less foamy', 'Scent is personal'], 'U1724085339140-531fe39625f7'],
  ['Nourishing shower and body oil', 'beauty', 'bath-body', 24, ['body-washes'],
    'Cleanses like a wash, rinses to a silky finish.', 'Very dry skin and winter.', 'Showers with slippery floors — use carefully.',
    ['Skin feels moisturised after rinsing', 'Can skip body lotion', 'Spa-like'], ['Bathtub can get slippery', 'Pricier than gel'], 'P8856770'],
  ['Exfoliating body scrub', 'beauty', 'bath-body', 18, ['body-washes', 'under-25'],
    'Buffs away dry, rough patches for smoother skin.', 'Before self-tan, shaving or a special night out.', 'Sensitive or broken skin.',
    ['Instantly smoother skin', 'Nice weekly ritual', 'Preps for tan and shaving'], ['Messy jar', 'Not for daily use'], 'P27860845'],
  ['Natural loofah sponges, 2-pack', 'beauty', 'bath-body', 10, ['body-washes', 'under-25'],
    'Plant-based scrubbers for a gentle daily exfoliation.', 'Anyone swapping out plastic shower puffs.', 'Very sensitive skin.',
    ['Biodegradable', 'Lathers body wash well', 'Cheap to replace'], ['Replace every month or two', 'Needs to dry between uses'], 'P7262747'],
  ['Dry body brush', 'beauty', 'bath-body', 14, ['body-washes', 'under-25'],
    'A natural-bristle brush for a quick pre-shower exfoliation.', 'Rough skin on arms and legs.', 'Sensitive skin or eczema.',
    ['Two-minute routine', 'Skin feels smoother', 'Lasts for years'], ['Bristles feel firm at first', 'Keep it dry between uses'], 'P7020266'],
  // Hair
  ['Wide-tooth detangling comb', 'beauty', 'hair', 9, ['hair-combs', 'under-25'],
    'Works through knots without snapping wet or curly hair.', 'Curly, thick and wet hair.', 'Fine, straight hair that needs smoothing.',
    ['Less breakage', 'Great in the shower', 'Cheap'], ['Not for sleek styling', 'Easy to misplace'], 'P7440128'],
  ['Sandalwood hair comb', 'beauty', 'hair', 12, ['hair-combs', 'under-25'],
    'A smooth, static-free wooden comb with a light natural scent.', 'Fine and straight hair, and frizz-prone winter hair.', 'Very tightly coiled hair.',
    ['No static', 'Gentle on the scalp', 'Lovely small gift'], ['Avoid soaking it', 'Finer teeth than a detangler'], 'P15694772'],
  ['Wooden paddle brush', 'beauty', 'hair', 16, ['hair-combs', 'under-25'],
    'A cushioned brush with wooden pins for long, straight hair.', 'Long hair and scalp massage lovers.', 'Tight curls and coils.',
    ['Smooths and detangles', 'Feels great on the scalp', 'Good for blow-drying'], ['Bulky for travel', 'Cushion can trap water'], 'P5468620'],
  ['Afro pick comb set', 'beauty', 'hair', 10, ['hair-combs', 'under-25'],
    'Long-tooth picks for lifting volume and shaping natural hair.', 'Afros, coils and big curls.', 'Fine, straight hair.',
    ['Lifts at the root without flattening', 'Metal and plastic options', 'Pocket-sized'], ['Use on stretched or dry styles', 'Metal picks can be cold'], 'P7451209'],
  ['Hair comb set for every texture', 'beauty', 'hair', 14, ['hair-combs', 'under-25'],
    'Wide-tooth, fine-tooth and tail combs in one set.', 'Households with different hair types.', 'Anyone wanting one premium comb.',
    ['Covers parting, detangling and styling', 'Good value', 'Easy to share'], ['Plastic feels basic', 'Takes up drawer space'], 'P7428093'],
  // Garden
  ['Bypass pruning shears', 'home', 'garden', 22, ['gardening-tools'],
    'Clean, scissor-like cuts for roses, shrubs and herbs.', 'Anyone with shrubs, roses or a herb bed.', 'Thick branches — use loppers.',
    ['Clean cuts heal faster', 'Safety lock', 'Comfortable grip'], ['Needs occasional sharpening', 'Not for dead wood'], 'P6662500'],
  ['Breathable gardening gloves', 'home', 'garden', 14, ['gardening-tools', 'under-25'],
    'Thin, grippy gloves that keep hands clean but let you feel what you’re doing.', 'Planting, weeding and potting.', 'Thorny rose pruning — get gauntlets.',
    ['Great grip', 'Machine washable', 'Several pairs per pack'], ['Not thorn-proof', 'Sizing runs small'], 'P37397152'],
  ['Hand trowel and cultivator set', 'home', 'garden', 19, ['gardening-tools', 'under-25'],
    'The two tools you reach for most when planting.', 'Pots, raised beds and balcony gardens.', 'Large beds — you’ll want a full spade.',
    ['Sturdy and simple', 'Wooden handles', 'Nice gift for new gardeners'], ['Clean and dry after use', 'Small for big jobs'], 'P18222297'],
  ['Galvanised watering can', 'home', 'garden', 32, ['gardening-tools'],
    'A classic metal can with a long spout for gentle, even watering.', 'Containers, seedlings and good-looking patios.', 'Large gardens — a hose is easier.',
    ['Lasts for years', 'Looks great outdoors', 'Gentle rose head'], ['Heavy when full', 'Pricier than plastic'], 'P4622067'],
  ['Garden hand tool set', 'home', 'garden', 29, ['gardening-tools'],
    'Rake, cultivator and weeder for loosening soil and pulling weeds.', 'Vegetable patches and borders.', 'Indoor plants only.',
    ['Covers most small jobs', 'Comfortable grips', 'Rust-resistant heads'], ['Bag sold separately on some', 'Short handles mean kneeling'], 'P9507250'],
  // Fireplace
  ['Fireplace tool set', 'home', 'living', 59, ['fireplace-accessories'],
    'Poker, tongs, brush and shovel on a stand that keeps the hearth tidy.', 'Anyone with a working fireplace or wood stove.', 'Gas and electric fireplaces.',
    ['Everything in one place', 'Tongs make log moving safer', 'Looks good on the hearth'], ['Cheap sets wobble', 'Check the height for your hearth'], 'P10560144'],
  ['Indoor firewood log holder', 'home', 'living', 49, ['fireplace-accessories'],
    'A metal rack that keeps a stack of logs dry and within reach.', 'Wood burners and open fires.', 'Small rooms with no floor space.',
    ['Keeps logs off the floor', 'Doubles as decor', 'Easy to restock'], ['Bark and dust fall through', 'Takes up space'], 'P10759626'],
  ['Fireplace safety screen', 'home', 'living', 69, ['fireplace-accessories'],
    'A mesh screen that stops sparks and keeps little hands back.', 'Homes with kids, pets or rugs near the fire.', 'Closed wood stoves with doors.',
    ['Catches sparks', 'Peace of mind', 'Folding panels fit most openings'], ['Measure the opening first', 'Gets hot — don’t touch while lit'], 'P14072615'],
  ['Extra-long fireplace matches', 'home', 'living', 9, ['fireplace-accessories', 'under-25'],
    '11-inch matches for lighting fires and deep candles safely.', 'Fireplaces, fire pits and candle jars.', 'Windy outdoor lighting — use a lighter.',
    ['Keeps fingers away from the flame', 'Handsome box', 'Cheap'], ['Burn quickly', 'Keep away from children'], 'P18693815'],
  // Wreaths & garlands
  ['Christmas wreath with baubles', 'home', 'living', 45, ['wreaths-garlands', 'christmas'],
    'A full faux-fir wreath trimmed with red baubles.', 'Front doors, mantels and walls.', 'People who want real pine scent.',
    ['Reusable every year', 'No needles to sweep', 'Ready to hang'], ['Fluff the branches after storage', 'Bulky to store'], 'P5942621'],
  ['Dried wheat wreath', 'home', 'living', 35, ['wreaths-garlands', 'fall', 'thanksgiving'],
    'A rustic wheat wreath that works from September to Thanksgiving.', 'Autumn decor and neutral interiors.', 'Damp porches — keep it under cover.',
    ['Warm, natural look', 'Works indoors all autumn', 'Lightweight'], ['Sheds a little', 'Fragile'], 'P5698387'],
  ['Pine garland, 9 ft', 'home', 'living', 29, ['wreaths-garlands', 'christmas'],
    'A full faux-pine garland for mantels, banisters and doorways.', 'Staircases and fireplace mantels.', 'Anyone wanting a ready-decorated look.',
    ['Easy to dress up', 'Bendable branches', 'Reusable'], ['Needs ties or hooks', 'Better with lights added'], 'P734219'],
  ['Pre-lit garland with baubles', 'home', 'living', 39, ['wreaths-garlands', 'christmas'],
    'Warm lights and gold baubles already woven in.', 'Instant festive mantels with no styling.', 'Rooms with no nearby socket — check for battery models.',
    ['Done in minutes', 'Timer on many models', 'Cosy glow'], ['Bulbs can’t always be replaced', 'Fixed colour scheme'], 'P6315163'],
  // Figurines
  ['Ceramic mushroom figurines', 'home', 'living', 24, ['figurines', 'under-25'],
    'Glossy toadstools for shelves, plant pots and windowsills.', 'Cottagecore fans and plant lovers.', 'Strict minimalists.',
    ['Charming and cheerful', 'Works indoors or in pots', 'Easy gift'], ['Ceramic chips if dropped', 'Small'], 'P37676257'],
  ['Ceramic cat figurine', 'home', 'living', 22, ['figurines', 'under-25'],
    'A smiling hand-painted cat to brighten a shelf or desk.', 'Cat lovers, and anyone who can’t have a real one.', 'People who dislike ornaments.',
    ['Instantly makes people smile', 'Hand-painted details', 'Great gift'], ['Delicate', 'Designs vary'], 'P34019753'],
  ['Wooden nutcracker figurine', 'home', 'living', 29, ['figurines', 'christmas'],
    'A classic painted nutcracker for the mantel or tree.', 'Traditional Christmas decor and collectors.', 'Modern, minimal interiors.',
    ['Timeless holiday decor', 'Lasts for decades', 'Kids love them'], ['Seasonal', 'Paint can chip'], 'P14758787'],
  ['Abstract ceramic face sculpture', 'home', 'living', 34, ['figurines'],
    'A sculptural white piece that adds calm to bookshelves and consoles.', 'Neutral, modern interiors.', 'Busy, colourful rooms.',
    ['Gallery feel for less', 'Matte, neutral finish', 'Works anywhere'], ['Dust shows on matte surfaces', 'Fragile'], 'P36382214'],
  ['Ceramic songbird figurines', 'home', 'living', 26, ['figurines'],
    'A pair of glossy blue birds for a windowsill or bookshelf.', 'Colourful shelves and gift-giving.', 'Anyone wanting neutral decor.',
    ['Cheerful colour', 'Pair looks great together', 'Easy gift'], ['Delicate', 'Small'], 'P32490757'],
  // Seasonal decorations & costumes
  ['Glass Christmas bauble set', 'seasonal-finds', null, 24, ['seasonal-decorations', 'christmas', 'under-25'],
    'Shiny glass baubles in red and gold that catch the tree lights.', 'Traditional trees and family heirloom starters.', 'Homes with toddlers or cats — choose shatterproof.',
    ['Real-glass sparkle', 'Mix-and-match colours', 'Lasts for years'], ['Breakable', 'Store carefully'], 'P35362630'],
  ['Venetian masquerade mask', 'seasonal-finds', null, 15, ['costumes-accessories', 'halloween', 'under-25'],
    'An ornate eye mask with lace detail and a silk flower.', 'Masquerade parties and elegant costumes.', 'Kids — the edges are delicate.',
    ['Instant glamour', 'Comfortable ties', 'Reusable'], ['Limited peripheral vision', 'Decorations are fragile'], 'P3836671'],
  ['Hooded velvet cape', 'seasonal-finds', null, 29, ['costumes-accessories', 'halloween'],
    'A long, swishy cape that turns any black outfit into a costume.', 'Witches, vampires and last-minute costumes.', 'Rainy trick-or-treating.',
    ['Works for many costumes', 'Dramatic in photos', 'Reusable'], ['Length can trip shorter people', 'Hand-wash'], 'P9919507'],
  ['Classic sheet ghost costume', 'seasonal-finds', null, 19, ['costumes-accessories', 'halloween', 'under-25'],
    'The easiest costume there is — with cut-outs placed for actually seeing.', 'Couples, groups and last-minute parties.', 'Anyone who wants a scary costume.',
    ['Fits everyone', 'Funny in photos', 'Cheap'], ['Warm to wear for hours', 'Easy to step on'], 'P18960712'],
  ['Devil horns headband', 'seasonal-finds', null, 9, ['costumes-accessories', 'halloween', 'under-25'],
    'Red horns on a comfy headband — add a trident and you’re done.', 'Kids, adults and quick costume upgrades.', 'Anyone wanting a full costume.',
    ['Comfortable all evening', 'Works with everyday clothes', 'Very cheap'], ['Simple', 'Headbands can pinch'], 'P5859339'],
  // Bakeware
  ['Non-stick baking sheet set', 'home', 'kitchen', 25, ['bakeware'],
    'Sheet pans for cookies, roast vegetables and traybakes.', 'Every kitchen — the most-used bakeware there is.', 'Anyone who uses metal utensils on non-stick.',
    ['Easy release and clean-up', 'Three useful sizes', 'Stack neatly'], ['Coating wears with dishwashers', 'Can warp at high heat'], 'P8478048'],
  ['Loaf pan', 'home', 'kitchen', 15, ['bakeware', 'under-25'],
    'For banana bread, sandwich loaves and meatloaf.', 'Home bakers starting out.', 'Free-form sourdough — use a Dutch oven.',
    ['Even browning', 'Easy release', 'Cheap'], ['Hand-wash recommended', 'One size only'], 'P10751484'],
  ['12-cup muffin tin', 'home', 'kitchen', 16, ['bakeware', 'under-25'],
    'Muffins, cupcakes, egg bites and mini frittatas.', 'Meal-preppers and bakers.', 'Jumbo muffins — get a large-cup tin.',
    ['Very versatile', 'Non-stick', 'Cheap'], ['Hard to clean the corners', 'Use liners for easy release'], 'P4051608'],
  ['Ceramic pie dish', 'home', 'kitchen', 24, ['bakeware', 'thanksgiving'],
    'A fluted dish that bakes evenly and goes straight to the table.', 'Pies, quiches and crumbles.', 'Bakers wanting a crisp metal-pan crust.',
    ['Oven-to-table good looks', 'Even heating', 'Dishwasher safe'], ['Heavier than metal', 'Can crack with sudden temperature changes'], 'P5836520'],
  // Crockpot dinners
  ['Electric multi-cooker', 'home', 'kitchen', 99, ['crockpot-dinners', 'lazy'],
    'Slow cooks, pressure cooks and sautés in one pot.', 'Busy households and dump-and-go dinners.', 'Small kitchens with no counter space.',
    ['Replaces several appliances', 'Pressure-cooks in a fraction of the time', 'Keep-warm setting'], ['Learning curve', 'Bulky'], 'U1544233726-9f1d2b27be8b'],
  // Gaming room
  ['Wired gaming headset', 'gadgets', null, 49, ['gaming-room-setups'],
    'Clear chat mic and comfy cushions for long sessions.', 'Console and PC gamers who play online.', 'Gym or commute use.',
    ['Clear voice chat', 'Comfortable for hours', 'Works with most consoles'], ['Cable can get in the way', 'Bulky'], 'P9742608'],
  ['Ergonomic gaming chair', 'gadgets', null, 199, ['gaming-room-setups'],
    'A supportive high-back chair with lumbar and neck pillows.', 'Long gaming or work sessions.', 'Small rooms — they’re big.',
    ['Adjustable recline and arms', 'Lumbar support', 'Looks the part'], ['Faux leather can get warm', 'Assembly takes time'], 'P7862645'],
  ['Wireless game controller', 'gadgets', null, 59, ['gaming-room-setups'],
    'A spare pad for couch co-op, or a better one for PC.', 'Multiplayer households and PC gamers.', 'Anyone who only plays mouse-and-keyboard games.',
    ['Comfortable grip', 'Rechargeable', 'Works across devices'], ['Check console compatibility', 'Batteries wear over time'], 'P15592023'],
  ['Gaming desk with cable management', 'gadgets', null, 149, ['gaming-room-setups'],
    'A wide desk with room for monitors, plus trays to hide the cables.', 'Dual-monitor setups and streamers.', 'Small bedrooms — measure first.',
    ['Space for big setups', 'Tidier cables', 'Sturdy frame'], ['Heavy to move', 'Assembly takes an hour or two'], 'P33888375'],
  // Boots
  ['Women’s knee-high boots', 'fashion', 'women', 119, ['boots', 'women', 'fall'],
    'Sleek leather-look boots with a block heel for skirts, dresses and jeans.', 'Autumn outfits and smart-casual days.', 'Wide calves — check the shaft measurements.',
    ['Dresses up any outfit', 'Walkable block heel', 'Inner zip'], ['Calf fit varies', 'Take time to break in'], 'P27598915'],
  ['Lace-up combat boots', 'fashion', 'women', 89, ['boots', 'women', 'fall'],
    'Chunky lug-sole boots that go with everything from dresses to denim.', 'Everyday wear and rainy cities.', 'Anyone wanting a light, sleek shoe.',
    ['Grippy chunky sole', 'Side zip on many', 'Goes with everything'], ['Heavy', 'Laces take time'], 'P27256460'],
  ['Heeled ankle boots', 'fashion', 'women', 79, ['boots', 'women'],
    'A tan leather-look ankle boot with a stacked heel.', 'Work outfits and evenings out.', 'Long days on your feet.',
    ['Elongates the leg', 'Works with jeans and dresses', 'Easy pull-on'], ['Heel height isn’t for everyone', 'Leather-look scuffs'], 'P27256473'],
  ['Men’s leather work boots', 'fashion', 'men', 129, ['boots', 'men'],
    'Rugged lace-up boots with a cushioned sole that look better with age.', 'Weekends, cold weather and casual workwear.', 'Formal outfits.',
    ['Durable leather', 'Grippy sole', 'Ages well'], ['Break-in period', 'Heavy'], 'P30229957'],
  ['Waterproof winter boots', 'fashion', null, 99, ['boots', 'men', 'women'],
    'Insulated, waterproof boots with deep treads for snow and slush.', 'Snowy commutes and winter walks.', 'Mild climates — they’ll be too warm.',
    ['Warm and dry', 'Grippy on ice', 'Easy lace-up'], ['Bulky', 'Too warm indoors'], 'P15878515'],
  // Coats & jackets
  ['Men’s wool-blend overcoat', 'fashion', 'men', 159, ['coats-jackets', 'men', 'fall'],
    'A belted, below-the-knee coat that works over suits and knitwear.', 'Office commutes and smart winter outfits.', 'Very wet climates — add an umbrella.',
    ['Instantly polished', 'Warm wool blend', 'Fits over a blazer'], ['Dry-clean only on many', 'Shows lint'], 'P34609625'],
  ['Women’s faux-leather jacket', 'fashion', 'women', 69, ['coats-jackets', 'women'],
    'A soft, relaxed faux-leather jacket that toughens up any outfit.', 'Transitional weather and evenings out.', 'Freezing days — it’s a layer, not a coat.',
    ['Goes with everything', 'Vegan', 'Easy to wipe clean'], ['Less breathable than leather', 'Can crease'], 'P11548432'],
  // Outerwear
  ['Women’s long puffer coat', 'fashion', 'women', 129, ['outerwear', 'women'],
    'Calf-length warmth that feels like wearing a duvet.', 'Cold commutes and standing around outdoors.', 'Mild winters.',
    ['Very warm', 'Covers the legs', 'Hooded'], ['Bulky on public transport', 'Hard to sit in'], 'P10392155'],
  ['Packable rain jacket', 'fashion', null, 59, ['outerwear', 'men', 'women', 'travel'],
    'A light waterproof shell that folds into its own pocket.', 'Travel, hiking and unpredictable weather.', 'Cold days without layers underneath.',
    ['Waterproof and windproof', 'Packs small', 'Adjustable hood'], ['Not insulated', 'Can feel clammy'], 'P12505397'],
  ['Sherpa fleece jacket', 'fashion', null, 49, ['outerwear', 'women'],
    'A cosy high-pile fleece for weekends and walks.', 'Layering and casual cool days.', 'Rain — it soaks up water.',
    ['Very soft and warm', 'Easy to layer', 'Machine washable'], ['Pills over time', 'Not wind-proof'], 'P30372298'],
  ['Quilted jacket', 'fashion', 'men', 79, ['outerwear', 'men'],
    'A light, padded jacket that layers under a coat or works on its own.', 'Autumn and mild winter days.', 'Deep winter cold.',
    ['Light warmth', 'Smart-casual look', 'Packs flat'], ['Not waterproof', 'Shows creases'], 'P8557408'],
  ['Hooded parka with faux-fur trim', 'fashion', 'men', 149, ['outerwear', 'men'],
    'A long, insulated parka with a fur-trimmed hood for proper cold.', 'Snowy winters and long outdoor days.', 'City winters that rarely drop below freezing.',
    ['Seriously warm', 'Hood blocks wind', 'Lots of pockets'], ['Heavy', 'Too warm for mild days'], 'P6207410'],
  // Suits
  ['Men’s two-piece suit', 'fashion', 'men', 199, ['suits', 'men'],
    'A slim-fit jacket and trousers for weddings, interviews and the office.', 'First suits and wedding season.', 'Anyone who needs it tailored and has no time — budget for alterations.',
    ['Instantly sharp', 'Separates can be worn alone', 'Versatile navy or charcoal'], ['Usually needs hemming', 'Dry-clean'], 'P19411803'],
  ['Women’s trouser suit', 'fashion', 'women', 129, ['suits', 'women'],
    'A relaxed blazer and wide trousers that work together or apart.', 'Work, events and smart weekends.', 'Very formal dress codes — go tailored.',
    ['Two outfits in one', 'Comfortable cut', 'Modern neutral colours'], ['Wrinkles in travel', 'Sizing varies'], 'P10032513'],
  ['Silk tie set', 'fashion', 'men', 29, ['suits', 'men'],
    'Three patterned silk ties to refresh a suit or two.', 'Office wear and weddings.', 'Casual dress codes.',
    ['Easy way to update suits', 'Classic patterns', 'Good gift'], ['Silk stains easily', 'Store rolled or hung'], 'P34342977'],
  // Slippers
  ['Faux-fur slide slippers', 'fashion', 'women', 25, ['slippers', 'women'],
    'Open-toe fluffy slides that feel like walking on a cloud.', 'Lounging at home and morning coffee.', 'Cold floors — your toes will feel it.',
    ['Very soft', 'Easy slip-on', 'Cute gift'], ['Not for outdoors', 'Fluff flattens over time'], 'P12969102'],
  ['Memory-foam moccasin slippers', 'fashion', null, 35, ['slippers', 'men', 'women'],
    'Suede-look moccasins with a cushioned footbed and grippy sole.', 'All-day wear at home and quick trips outside.', 'Hot sleepers who prefer open slippers.',
    ['Supportive footbed', 'Indoor/outdoor sole', 'Warm'], ['Suede marks easily', 'Can feel snug at first'], 'P30979631'],
  ['Embroidered wool slippers', 'fashion', null, 39, ['slippers', 'women'],
    'Hand-embroidered felted wool slippers that stay warm and breathable.', 'Cold floors and anyone who loves handmade.', 'Wet outdoor trips.',
    ['Naturally warm', 'Breathable wool', 'Beautiful details'], ['Not machine washable', 'Slippery on wood — add grips'], 'P34787523'],
  ['Hedgehog novelty slippers', 'fashion', null, 22, ['slippers', 'under-25'],
    'Plush animal slippers that make everyone smile.', 'Gifts, kids and Christmas morning photos.', 'Anyone who wants a sleek slipper.',
    ['Very cosy', 'Fun gift', 'Soft sole'], ['Bulky', 'Novelty wears off'], 'P7938228'],
  // Oxfords & loafers
  ['Men’s leather oxford shoes', 'fashion', 'men', 119, ['oxfords-loafers', 'men', 'suits'],
    'Classic closed-lace dress shoes for suits and formal events.', 'Weddings, interviews and the office.', 'Casual weekend outfits.',
    ['Timeless and formal', 'Resoleable on many', 'Polishes beautifully'], ['Break-in period', 'Needs regular polishing'], 'P8670488'],
  ['Leather brogues', 'fashion', 'men', 109, ['oxfords-loafers', 'men'],
    'Perforated wingtip brogues that bridge smart and casual.', 'Chinos, tweed and smart-casual offices.', 'Black-tie events.',
    ['Versatile', 'Character with age', 'Sturdy'], ['Heavier than plain shoes', 'Perforations collect polish'], 'P6765524'],
  ['Men’s leather penny loafers', 'fashion', 'men', 99, ['oxfords-loafers', 'men'],
    'Slip-on loafers that dress up jeans and dress down suits.', 'Smart-casual wardrobes and travel days.', 'Wet weather.',
    ['Easy slip-on', 'Goes with almost everything', 'Light'], ['Less support than lace-ups', 'Sizing varies by brand'], 'P34871894'],
  ['Women’s chunky chain loafers', 'fashion', 'women', 79, ['oxfords-loafers', 'women'],
    'Lug-sole loafers with a gold chain detail — the shoe of the season.', 'Workwear, skirts and cropped trousers.', 'Anyone who prefers a light, flat shoe.',
    ['On-trend and comfortable', 'Height without heels', 'Works with socks'], ['Heavy sole', 'Patent can crease'], 'P27426618'],
  ['Suede loafers', 'fashion', 'men', 89, ['oxfords-loafers', 'men'],
    'Soft unlined suede loafers in warm neutrals.', 'Summer-to-autumn smart-casual.', 'Rain and slush.',
    ['Very comfortable', 'Light and flexible', 'Easy to dress up or down'], ['Needs suede protector', 'Marks easily'], 'P31935097'],
];

// Existing products that belong in a trend.
const CROSS_LIST = {
  'womens-chelsea-boots': ['boots'],
  'mens-chelsea-boots': ['boots'],
  'womens-classic-belted-trench-coat': ['coats-jackets'],
  'womens-wool-blend-coat': ['coats-jackets'],
  'mens-field-jacket': ['coats-jackets'],
  'mens-denim-jacket': ['coats-jackets'],
  'carrington-chocolate-ponte-dress-coat-coatigan': ['coats-jackets'],
  'carrington-forest-green-ponte-dress-coat-coatigan': ['coats-jackets'],
  'mens-puffer-jacket': ['outerwear'],
  'womens-puffer-vest': ['outerwear'],
  'mens-oxford-shirt': ['suits'],
  'oversized-blazer': ['suits'],
  'womens-wide-leg-trousers': ['suits'],
  'leather-belt': ['suits'],
  'wide-brim-witch-hat': ['costumes-accessories'],
  'halloween-face-paint-kit': ['costumes-accessories'],
  'kids-pumpkin-costume': ['costumes-accessories'],
  'led-jack-o-lantern-set-3-pack': ['seasonal-decorations'],
  'cobweb-and-spider-decor-set': ['seasonal-decorations'],
  'posable-halloween-skeleton-5-ft': ['seasonal-decorations'],
  'autumn-tablecloth': ['seasonal-decorations'],
  'warm-white-christmas-string-lights': ['seasonal-decorations'],
  'christmas-stockings-set-of-4': ['seasonal-decorations'],
  'pre-lit-artificial-christmas-tree-6-ft': ['seasonal-decorations'],
  'autumn-door-wreath': ['wreaths-garlands'],
  'heated-throw-blanket': ['fireplace-accessories'],
  'one-step-hair-dryer-brush': ['hair-combs'],
  'programmable-slow-cooker': ['crockpot-dinners'],
  'enamelled-cast-iron-dutch-oven': ['crockpot-dinners', 'bakeware'],
  'roasting-pan-with-rack': ['crockpot-dinners'],
  'instant-read-meat-thermometer': ['crockpot-dinners'],
  'app-controlled-led-strip-lights': ['gaming-room-setups'],
  '27-inch-4k-monitor': ['gaming-room-setups'],
  'low-profile-mechanical-keyboard': ['gaming-room-setups'],
  'monitor-light-bar': ['gaming-room-setups'],
};

// ---- Trends ------------------------------------------------------------------
const EDITS = {
  beauty: 'The Beauty Shelf',
  wardrobe: 'Cold-Weather Wardrobe',
  holidays: 'Home for the Holidays',
  home: 'Projects at Home',
};

// [slug, title, rank (shopping) or null, growth, note, edit, status, category, keyword, description, hero]
const TRENDS = [
  ['eyeliners', 'Eyeliners', 1, '↑243%', 'month over month', 'beauty', 'trending', 'makeup',
    'winged eyeliner, gel eyeliner, eyeliner for hooded eyes',
    'Graphic wings and smudgy kohl are both back. The pens, gels and pencils that make either look easy — even on hooded eyes.', 'P8005247'],
  ['gardening-tools', 'Gardening tools', 2, '↑152%', 'month over month', 'home', 'trending', 'garden',
    'autumn garden tools, pruning shears, gifts for gardeners',
    'Autumn is planting and pruning season, and people are kitting out. The hard-working basics every gardener reaches for, from pruners to a proper watering can.', 'P3971211'],
  ['face-lotions-creams', 'Face lotions & creams', 3, '↑102%', 'month over month', 'beauty', 'trending', 'skincare',
    'night cream, face lotion with spf, barrier repair cream',
    'Cooler air means drier skin. Night creams, barrier repair and daily SPF lotions, matched to your skin type.', 'P6635922'],
  ['costumes-accessories', 'Costumes & accessories', 4, '↑93%', 'month over month', 'holidays', 'trending', null,
    'halloween costume ideas, easy costumes, masquerade',
    'Halloween costume shopping is in full swing. Pieces that turn everyday clothes into a costume, plus a few easy wins for last-minute parties.', 'P9147706'],
  ['seasonal-decorations', 'Seasonal & holiday decorations', 5, '↑77%', 'month over month', 'holidays', 'trending', null,
    'halloween decor, christmas decorations, fall table',
    'From spooky porches to the first Christmas lights — people are decorating earlier every year. The decor worth bringing out season after season.', 'P35262373'],
  ['fireplace-accessories', 'Fireplace & wood stove accessories', 6, '↑63%', 'month over month', 'holidays', 'trending', 'living',
    'fireplace tool set, log holder, cozy fireplace',
    'First fires of the season are being lit. Tools, log storage and safety screens that make a fireplace easier and safer to live with.', 'P15558300'],
  ['serums-essences', 'Serums & essences', 7, '↑61%', 'month over month', 'beauty', 'trending', 'skincare',
    'vitamin c serum, hyaluronic acid, retinol for beginners',
    'Serums are where skincare does its heavy lifting. A clear guide to what each one does — brightening, hydrating, smoothing — so you buy the right one.', 'P8102021'],
  ['boots', 'Boots', 8, '↑54%', 'month over month', 'wardrobe', 'trending', null,
    'fall boots, knee high boots, combat boots outfit',
    'Boot season is here. Knee-highs, lug-sole combats, Chelseas and proper winter boots — the shapes everyone is wearing this autumn.', 'P12932771'],
  ['facial-moisturizers', 'Facial moisturizers', 9, '↑50%', 'month over month', 'beauty', 'trending', 'skincare',
    'best moisturizer for dry skin, oil free moisturizer, tinted moisturizer',
    'The one product every routine needs. Gel-creams for oily skin, rich creams for dry — and tinted options for low-effort mornings.', 'P29755259'],
  ['coats-jackets', 'Coats & jackets', 10, '↑46%', 'month over month', 'wardrobe', 'trending', null,
    'wool coat, trench coat outfit, leather jacket women',
    'The investment buy of the season. Tailored wool coats, trench coats and leather jackets that will last for years.', 'P30345957'],
  ['outerwear', 'Outerwear', 11, '↑45%', 'month over month', 'wardrobe', 'trending', null,
    'puffer coat, rain jacket, fleece jacket',
    'For when it’s properly cold, wet or both. Puffers, parkas, rain shells and fleece — the practical layers people are buying now.', 'P19876599'],
  ['hair-combs', 'Hair combs', 12, '↑44%', 'month over month', 'beauty', 'trending', 'hair',
    'wide tooth comb, wooden comb, detangling curly hair',
    'Gentler detangling is having a moment. The right comb or brush for your hair type — straight, curly or coily.', 'P28994386'],
  ['wreaths-garlands', 'Wreaths & garlands', 13, '↑44%', 'month over month', 'holidays', 'trending', 'living',
    'fall wreath, christmas garland, front door wreath',
    'Front doors and mantels are getting dressed early this year. Autumn wheat, faux fir and pre-lit garlands you can reuse every season.', 'P10776545'],
  ['suits', 'Suits & suit separates', 14, '↑36%', 'month over month', 'wardrobe', 'trending', null,
    'mens suit, womens suit, wedding guest suit',
    'Tailoring is back for weddings, offices and evenings out — and separates make it more versatile than ever. Suits plus the shirts, ties and shoes that finish them.', 'P32670017'],
  ['bakeware', 'Bakeware', 15, '↑35%', 'month over month', 'holidays', 'trending', 'kitchen',
    'baking essentials, loaf pan, pie dish',
    'Baking season starts now. The pans that make everything from banana bread to Thanksgiving pie turn out right.', 'P7966002'],
  ['slippers', 'Slippers', 17, '↑29%', 'month over month', 'wardrobe', 'trending', null,
    'cozy slippers, fluffy slippers, slippers gift',
    'Cosy season, officially. Fluffy slides, supportive moccasins and hand-made wool — slippers for every kind of homebody.', 'P1444417'],
  ['figurines', 'Figurines', 18, '↑28%', 'month over month', 'holidays', 'trending', 'living',
    'shelf decor, ceramic figurines, mushroom decor',
    'Small sculptures are the easiest way to give a shelf personality. Playful ceramics, a classic nutcracker and calm, modern pieces.', 'P14793959'],
  ['body-washes', 'Body washes', 19, '↑27%', 'month over month', 'beauty', 'trending', 'bath-body',
    'moisturizing body wash, shower routine, body scrub',
    'The “everything shower” is the self-care ritual of the season. Gentle washes, oils and scrubs that turn a quick rinse into a proper routine.', 'P9475410'],
  ['oxfords-loafers', 'Oxfords & loafers', 20, '↑27%', 'month over month', 'wardrobe', 'trending', null,
    'loafers outfit, oxford shoes, chunky loafers women',
    'Smart shoes are back in rotation. Classic oxfords and brogues, slip-on loafers and the chunky chain loafer everyone is wearing.', 'P29258015'],
  ['crockpot-dinners', 'Crockpot dinners', null, '↑1,500%', 'searches, month over month', 'home', 'rising', 'kitchen',
    'crockpot dinner recipes, slow cooker meals, dump and go dinners',
    'Busy autumn weeknights call for set-and-forget dinners. The cookers and pans that make crockpot cooking easy.', 'P30678525'],
  ['gaming-room-setups', 'Gaming room setups', null, '↑700%', 'searches, month over month', 'home', 'rising', null,
    'gaming room ideas, gaming setup, rgb setup',
    'The gaming room makeover is this year’s favourite home project. The chair, desk, lighting and gear that make a setup feel finished.', 'P28993061'],
];

async function categoryId(client, slug, parentSlug) {
  if (!slug) return null;
  const { rows } = parentSlug
    ? await client.query('select c.id from categories c join categories p on p.id = c.parent_id where c.slug = $1 and p.slug = $2', [slug, parentSlug])
    : await client.query('select id from categories where slug = $1 and parent_id is null', [slug]);
  return rows[0]?.id ?? null;
}

async function ensureCategory(client, [slug, name, description, image], parentId, sortOrder, featured = false) {
  await client.query(
    `insert into categories (name, slug, parent_id, description, image_url, image_alt, sort_order, featured, active)
     values ($1, $2, $3, $4, $5, $1, $6, $7, true)
     on conflict (slug) do nothing`,
    [name, slug, parentId, description, photo(image), sortOrder, featured],
  );
}

export async function up(client) {
  const homeId = await categoryId(client, 'home');
  if (!homeId) return; // fresh database: the seed creates content and runs this afterwards

  // 1. Sections: Beauty (top level, after Fashion) and Home → Garden.
  await ensureCategory(client, BEAUTY, null, 2, true);
  const beautyId = await categoryId(client, 'beauty');
  for (const [i, c] of BEAUTY_CHILDREN.entries()) await ensureCategory(client, c, beautyId, i);
  for (const c of HOME_CHILDREN) await ensureCategory(client, c, homeId, 4);

  // Menu: Beauty after Fashion in the header, and in the footer shop list.
  if (!(await client.query(`select 1 from navigation_items where url = '/beauty'`)).rowCount) {
    const { rows } = await client.query(`select sort_order from navigation_items where location = 'header' and url = '/fashion'`);
    const after = rows[0]?.sort_order ?? 2;
    await client.query(`update navigation_items set sort_order = sort_order + 1 where location = 'header' and sort_order > $1`, [after]);
    await client.query(`insert into navigation_items (location, label, url, sort_order) values ('header', 'Beauty', '/beauty', $1)`, [after + 1]);
    const foot = await client.query(`select coalesce(max(sort_order), 0) + 1 as n from navigation_items where location = 'footer_shop'`);
    await client.query(`insert into navigation_items (location, label, url, sort_order) values ('footer_shop', 'Beauty', '/beauty', $1)`, [foot.rows[0].n]);
  }

  // 2. Products (skipped when the slug already exists).
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
      [rows[0].id, photo(image), name, credit(image)]);
  }
  for (const [slug, tags] of Object.entries(CROSS_LIST)) {
    await client.query(
      `update products set tags = (select array_agg(distinct t) from unnest(tags || $2::text[]) t), updated_at = now() where slug = $1`,
      [slug, tags],
    );
  }

  // 3. Trends: Pinterest shopping ranks lead (priority 200 − rank), searches follow.
  for (const [slug, title, rank, growth, note, edit, status, cat, keyword, description, hero] of TRENDS) {
    const source = rank ? `Pinterest Trends · shopping · #${rank} in the US` : 'Pinterest Trends · search';
    const priority = rank ? 200 - rank : 180;
    const catId = cat ? (await client.query('select id from categories where slug = $1', [cat])).rows[0]?.id ?? null : null;
    await client.query(
      `insert into trends (title, slug, keyword, description, image_url, category_id, source, trend_status, priority,
                           growth, growth_note, measured_at, edit, active)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
       on conflict (slug) do update set
         growth = coalesce(trends.growth, excluded.growth),
         growth_note = coalesce(trends.growth_note, excluded.growth_note),
         measured_at = coalesce(trends.measured_at, excluded.measured_at),
         edit = coalesce(trends.edit, excluded.edit)`,
      [title, slug, keyword, description, photo(hero), catId, source, status, priority, growth, note, MEASURED_AT, EDITS[edit]],
    );
  }
  // The existing Halloween costumes trend is also a growing search right now.
  await client.query(
    `update trends set growth = coalesce(growth, '↑40%'), growth_note = coalesce(growth_note, 'searches, month over month'),
            measured_at = coalesce(measured_at, $1), edit = coalesce(edit, $2), source = coalesce(source, 'Pinterest Trends · search')
      where slug = 'halloween-costumes'`,
    [MEASURED_AT, EDITS.holidays],
  );

  // 4. Homepage: the trending section becomes a shoppable grid of this month's trends.
  //    (The Pinterest figures stay behind the scenes — they set the order, shoppers see the products.)
  await client.query(
    `update homepage_sections set title = 'What everyone’s buying this month',
            subtitle = 'The pieces people can’t stop shopping for right now — picked, checked and ready to buy.',
            config = config || '{"limit": 8}'::jsonb
      where key = 'trending' and title = 'People are looking for these right now'`,
  );
}
