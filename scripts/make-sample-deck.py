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
def ab(left, right):
    # App extension (schema/APP_EXTENSIONS.md): kind=compare + x_ab = an A/B pick.
    # Swipe left / "no" = image.file (top); swipe right / "yes" = image.file_b (bottom).
    return {"left": left, "right": right}
cards=[
 dict(kind="option", image=img("B_a_LR-entry-to-kitchen_photo","Living room opened up to the kitchen, with a sage peninsula and the back windows beyond"),
  question="Open wall to the kitchen?",
  option_tags=["section:layout","wall:open"], decision="DEC-LAYOUT-1F",
  yes={"summary":"Open the LR/KIT wall: keep the open layouts (wall assumed non-bearing; engineer to confirm)."},
  no={"summary":"Keep the LR/KIT wall: all three R1 options assume it comes out, so R2 needs a closed-wall option.","eliminates":["OPT-KIT-A","OPT-KIT-B","OPT-KIT-C"]}),
 dict(kind="compare", image=img("B_b_Tom-seat-peninsula_photo","Top: seat at a peninsula facing the sink. Bottom: seat at an island facing the windows", b="C_b_Tom-seat-island_photo"),
  question="Counter seat or island seat?", x_ab=ab("Counter","Island"),
  option_tags=["section:layout","seat:faces-cook"],
  yes={"summary":"Picked the island seat (Option C): keep C if the engineer clears the bearing wall."},
  no={"summary":"Picked the peninsula counter seat (Option B): B's peninsula is the lead."}),
 dict(kind="option", image=img("B_c_cook-to-LR_photo","View from the sink back across the peninsula into the living room"),
  question="See the living room from the sink?",
  option_tags=["section:layout","sightline:cook-to-LR"],
  yes={"summary":"Open sightline from the cook to the LR is a keeper."},
  no={"summary":"Cook prefers a more tucked-away kitchen: consider a partial wall or a smaller opening."}),
 dict(kind="option", image=img("C_a_LR-entry-to-kitchen_photo","Living room with a big glass slider to the back yard"),
  question="A big glass door to the yard?",
  option_tags=["section:windows","glazing:6ft-slider"],
  yes={"summary":"Keep the 6' slider in the mix (also price B's layout with A's slider)."},
  no={"summary":"Prefer windows or the box-bay seat over a slider."}),
 dict(kind="option", image=img("C_d_DR-through-opening_photo","From the dining room through a wide cased opening into the kitchen"),
  question="Wide doorway from the dining room?",
  option_tags=["section:layout","wall:DR-cased-opening"], option="OPT-KIT-C",
  yes={"summary":"Wants the DR/KIT opening: get the engineer to check C."},
  no={"summary":"Keep the DR/KIT wall: drop C.","eliminates":["OPT-KIT-C"]}),
 dict(kind="detail", image=img("B_d_mud-room-entry_photo","Kitchen with a sage-green painted peninsula, warm white cabinets and a wood top"),
  question="Sage green with a warm wood top?",
  option_tags=["section:colors","paint:sage-island","paint:warm-white-perimeter","top:wood-island"],
  yes={"summary":"Sage island + warm white perimeter + wood top are in the running."},
  no={"summary":"Try other island colors next round: slate blue, oxblood, deep green-gray."}),
 dict(kind="detail", image=img("B_b_Tom-seat-peninsula_photo","Dark stone counters with white subway tile and a white farmhouse sink"),
  question="Dark stone counters, white tile?",
  option_tags=["section:textures","counter:dark-honed","backsplash:white-subway"],
  yes={"summary":"Dark honed counters (soapstone/granite/matte quartz) + white subway tile."},
  no={"summary":"Show lighter counters next round."}),
 dict(kind="detail", image=img("B_c_cook-to-LR_photo","Two brass and glass schoolhouse pendant lights over the counter"),
  question="Brass schoolhouse lights?",
  option_tags=["section:lighting","light:schoolhouse-pendant","metal:brass"],
  yes={"summary":"Schoolhouse pendants and brass finishes."},
  no={"summary":"Try other light styles and metals (nickel, black) next round."}),
 dict(kind="compare", image=img("B_a_LR-entry-to-kitchen","Top: the line-drawing render. Bottom: the photo-style version of the same view", b="B_a_LR-entry-to-kitchen_photo"),
  question="Which is easier to picture?", x_ab=ab("Drawing","Photo"),
  option_tags=["section:how-we-show-it","realism:photo-style"],
  yes={"summary":"Photo-style is easier: lead with photo-style mockups (keep the accurate render one tap away)."},
  no={"summary":"The plain renders read fine; photo-style passes are optional."}),
 dict(kind="option", image=img("plan_option-B","Floor plan of Option B: galley kitchen, peninsula and a bay window seat", fit="contain", gen="other"),
  question="Plan B: does it feel right?",
  option_tags=["section:layout","layout:peninsula","seat:box-bay"], decision="DEC-LAYOUT-1F", option="OPT-KIT-B",
  yes={"summary":"B leads into round 2.","sets":[{"decision":"DEC-LAYOUT-1F","value":"OPT-KIT-B"}]},
  no={"summary":"B is not the lead; ask what's off.","eliminates":["OPT-KIT-B"]}),
]
for i,c in enumerate(cards,1):
    c["id"]=f"SC-R01-{i:03d}"; c["order"]=i
    assert len(c["question"].split())<=8,(c["id"],c["question"])
    assert "detail" not in c
deck={"$comment":"SAMPLE CONTENT for app v0: built from the round-1 renders; questions are placeholders for Mark to edit.",
 "format":"31andrews.swipe_deck/1","deck_id":"DECK-R01-SAMPLE-v2","round":"R01","version":2,
 "created":"2026-10-25T11:30:00-04:00","realism":"concept","audience":["tom","jane"],
 "intro":"Swipe right if you love it.",
 "cards":[{k:c[k] for k in ["id","order","kind","image","question","x_ab","option_tags","decision","option","yes","no"] if k in c} for c in cards]}
import sys
json.dump(deck,open(sys.argv[1] if len(sys.argv)>1 else 'public/decks/R01-sample/deck.json','w'),indent=1,ensure_ascii=False)
print(len(cards))
