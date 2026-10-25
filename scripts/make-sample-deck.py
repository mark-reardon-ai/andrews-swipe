import json
I='img/'
def img(name, alt, room='kitchen', fit=None, b=None, gen='model_render'):
    widths=(900,1600) if name.startswith('plan') else (720,1280)
    d={"file":I+name+'.jpg',"alt":alt,"room":room,"realism":"concept",
       "x_webp":{str(w):f"{I}{name}-{w}.webp" for w in widths},
       "generator":{"tool":"other" if '_photo' in name else gen,
                    "references":[{"kind":"model_render","ref":"design/round1/renders/"+name.replace('_photo','')+".png"}] if not name.startswith('plan') else []}}
    if fit: d["fit"]=fit
    if b: d["file_b"]=I+b+'.jpg'; d["x_webp_b"]={str(w):f"{I}{b}-{w}.webp" for w in widths}
    return d
ILL="Sample round: an illustrative mockup, not the final design."
cards=[
 dict(kind="option", image=img("B_a_LR-entry-to-kitchen_photo","Living room opened up to the kitchen, with a sage peninsula and the back windows beyond"),
  question="What if the wall to the kitchen came out? Would you love walking in to this?",
  detail="Standing at the front of the living room, looking back toward the kitchen and yard. "+ILL,
  option_tags=["section:layout","wall:open"], decision="DEC-LAYOUT-1F",
  yes={"summary":"Open the LR/KIT wall: keep the open layouts (wall assumed non-bearing; engineer to confirm)."},
  no={"summary":"Keep the LR/KIT wall: all three R1 options assume it comes out, so R2 needs a closed-wall option.","eliminates":["OPT-KIT-A","OPT-KIT-B","OPT-KIT-C"]}),
 dict(kind="option", image=img("B_b_Tom-seat-peninsula_photo","Seated view from the peninsula stool toward the sink and range"),
  question="Tom's seat at the counter, facing the cook. Would you love sitting here while Jane cooks?",
  detail="This is the view from Tom's stool in Option B. "+ILL,
  option_tags=["section:layout","layout:peninsula","seat:faces-cook"], option="OPT-KIT-B",
  yes={"summary":"Facing the cook matters: favors B (peninsula) or C (island), not A."},
  no={"summary":"The peninsula seat doesn't appeal: look harder at C's island seat or A."}),
 dict(kind="option", image=img("B_c_cook-to-LR_photo","View from the sink back across the peninsula into the living room"),
  question="Would you like to see the living room and Tom while you're at the sink?",
  detail="From the cook's spot, looking back into the living room. "+ILL,
  option_tags=["section:layout","sightline:cook-to-LR"],
  yes={"summary":"Open sightline from the cook to the LR is a keeper."},
  no={"summary":"Cook prefers a more tucked-away kitchen: consider a partial wall or a smaller opening."}),
 dict(kind="compare", image=img("B_a_LR-entry-to-kitchen","Top: the line-drawing render. Bottom: the photo-style version of the same view", b="B_a_LR-entry-to-kitchen_photo"),
  question="Same room, two ways. Is the photo-style picture (bottom) easier to imagine living in?",
  detail="Top: the accurate computer drawing. Bottom: a photo-style pass over it; small details may differ.",
  option_tags=["section:how-we-show-it","realism:photo-style"],
  yes={"summary":"Lead with photo-style mockups in later rounds (keep the accurate render one tap away)."},
  no={"summary":"The plain renders read fine; photo-style passes are optional."}),
 dict(kind="option", image=img("C_a_LR-entry-to-kitchen_photo","Living room with a big glass slider to the back yard"),
  question="A big glass sliding door out to the yard. Love the extra light?",
  detail="Option C (and A) put a 6-foot slider in the back wall. Today the back wall has about 5'8\" of windows. "+ILL,
  option_tags=["section:windows","glazing:6ft-slider"],
  yes={"summary":"Keep the 6' slider in the mix (also price B's layout with A's slider)."},
  no={"summary":"Prefer windows or the box-bay seat over a slider."}),
 dict(kind="option", image=img("C_b_Tom-seat-island_photo","Seated view from an island stool toward the windows and sink"),
  question="An island seat looking out at the windows and the yard. Would you love this spot?",
  detail="Option C: Tom faces Jane and the back windows. "+ILL,
  option_tags=["section:layout","layout:island","seat:faces-cook"], option="OPT-KIT-C",
  yes={"summary":"Island seat appeals: keep C if the engineer clears the bearing wall with no new footings."},
  no={"summary":"Island seat doesn't appeal: B's peninsula is the lead."}),
 dict(kind="option", image=img("C_d_DR-through-opening_photo","From the dining room through a wide cased opening into the kitchen"),
  question="A wide doorway from the dining room into the kitchen. Do you like seeing through?",
  detail="Option C. This wall probably holds up the house, so it needs a structural engineer before we count on it. "+ILL,
  option_tags=["section:layout","wall:DR-cased-opening"], option="OPT-KIT-C",
  yes={"summary":"Wants the DR/KIT opening: get the engineer to check C."},
  no={"summary":"Keep the DR/KIT wall: drop C.","eliminates":["OPT-KIT-C"]}),
 dict(kind="detail", image=img("B_d_mud-room-entry_photo","Kitchen with a sage-green painted peninsula, warm white cabinets and a wood top"),
  question="A sage-green island with a warm wood top and creamy white cabinets. Your colors?",
  detail="Colors are just a starting idea. "+ILL,
  option_tags=["section:colors","paint:sage-island","paint:warm-white-perimeter","top:wood-island"],
  yes={"summary":"Sage island + warm white perimeter + wood top are in the running."},
  no={"summary":"Try other island colors next round: slate blue, oxblood, deep green-gray."}),
 dict(kind="detail", image=img("B_b_Tom-seat-peninsula_photo","Dark stone counters with white subway tile and a white farmhouse sink"),
  question="Dark, soft-looking stone counters with white tile behind. Is this your style?",
  detail="Like honed soapstone, an old New England favorite that darkens with age. "+ILL,
  option_tags=["section:textures","counter:dark-honed","backsplash:white-subway"],
  yes={"summary":"Dark honed counters (soapstone/granite/matte quartz) + white subway tile."},
  no={"summary":"Show lighter counters next round."}),
 dict(kind="detail", image=img("B_c_cook-to-LR_photo","Two brass and glass schoolhouse pendant lights over the counter","kitchen"),
  question="Old-fashioned glass and brass lights over the counter. Do you love them?",
  detail=ILL,
  option_tags=["section:lighting","light:schoolhouse-pendant","metal:brass"],
  yes={"summary":"Schoolhouse pendants and brass finishes."},
  no={"summary":"Try other light styles and metals (nickel, black) next round."}),
 dict(kind="option", image=img("plan_option-B","Floor plan of Option B: galley kitchen, peninsula and a bay window seat", fit="contain", gen="other"),
  question="Option B on paper: galley kitchen, a counter for Tom, and a window seat. Does it feel right?",
  detail="Mark's current favorite: Tom faces Jane, lots of cabinets, least structural work. Tap the plan to zoom.",
  option_tags=["section:layout","layout:peninsula","seat:box-bay"], decision="DEC-LAYOUT-1F", option="OPT-KIT-B",
  yes={"summary":"B leads into round 2.","sets":[{"decision":"DEC-LAYOUT-1F","value":"OPT-KIT-B"}]},
  no={"summary":"B is not the lead; ask what's off.","eliminates":["OPT-KIT-B"]}),
 dict(kind="option", image=img("plan_option-A","Floor plan of Option A: galley kitchen with an island in the old living room", fit="contain", gen="other"),
  question="Option A: the most cupboards and glass, but Tom's seat faces the yard, away from Jane. Still interested?",
  detail="Tap the plan to zoom.",
  option_tags=["section:layout","layout:island-in-LR","seat:faces-yard"], option="OPT-KIT-A",
  yes={"summary":"Keep A alive (storage and glass win)."},
  no={"summary":"Drop A.","eliminates":["OPT-KIT-A"]}),
]
for i,c in enumerate(cards,1):
    c["id"]=f"SC-R01-{i:03d}"; c["order"]=i
    assert len(c["question"])<=120,(c["id"],len(c["question"]))
    assert len(c.get("detail",""))<=280
deck={"$comment":"SAMPLE CONTENT for app v0: built from the round-1 renders; questions are placeholders for Mark to edit.",
 "format":"31andrews.swipe_deck/1","deck_id":"DECK-R01-SAMPLE-v1","round":"R01","version":1,
 "created":"2026-10-25T11:30:00-04:00","realism":"concept","audience":["tom","jane"],
 "intro":"Round 1 (sample): how the new kitchen could work. Swipe right on what you'd love to live with.",
 "cards":[{k:c[k] for k in ["id","order","kind","image","question","detail","option_tags","decision","option","gives_up_vs_expansion","yes","no"] if k in c} for c in cards]}
import sys
json.dump(deck,open(sys.argv[1] if len(sys.argv)>1 else 'public/decks/R01-sample/deck.json','w'),indent=1,ensure_ascii=False)
print(len(cards))
