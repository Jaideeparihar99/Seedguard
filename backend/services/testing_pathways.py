from __future__ import annotations


# Official Gazette S.O. 3443(E), dated 1 August 2024, names the two NSC regional centres.
# SATHI and the official NSRTC site provide the state contact handoff and central lab reference.
CENTRAL_LAB = "https://nsrtc.nic.in/"
CENTRAL_LAB_NOTIFICATION = "https://egazette.gov.in/WriteReadData/2024/256327.pdf"
STATE_CONTACT_DIRECTORY = "https://seedtrace.gov.in/ms014/directoryList"

CENTERS: list[dict[str, str]] = [
    {
        "id": "nsrtc-varanasi",
        "name": "National Seed Research and Training Centre (NSRTC)",
        "city": "Varanasi",
        "state": "Uttar Pradesh",
        "role": "Central Seed Testing Laboratory",
        "type": "central",
        "website": CENTRAL_LAB,
        "source_url": CENTRAL_LAB_NOTIFICATION,
    },
    {
        "id": "nsc-bhopal",
        "name": "National Seeds Corporation Seed Testing Laboratory",
        "city": "Bhopal",
        "state": "Madhya Pradesh",
        "role": "Regional centre of the Central Seed Testing Laboratory",
        "type": "regional",
        "website": "https://www.indiaseeds.com/",
        "source_url": CENTRAL_LAB_NOTIFICATION,
    },
    {
        "id": "nsc-secunderabad",
        "name": "National Seeds Corporation Seed Testing Laboratory",
        "city": "Secunderabad",
        "state": "Telangana",
        "role": "Regional centre of the Central Seed Testing Laboratory",
        "type": "regional",
        "website": "https://www.indiaseeds.com/",
        "source_url": CENTRAL_LAB_NOTIFICATION,
    },
]

PREPARATION_STEPS = [
    "For a concern about seed sold to you, contact your state agriculture department or seed inspector first and ask whether an official sample must be collected.",
    "Before sending a service sample, contact the laboratory and confirm it accepts farmer submissions, the required sample quantity, packaging, fees, and report timing.",
    "Keep the packet, tag, receipt, and your notes. Do not assume a home germination observation is an official test result.",
]

LIMITATION = (
    "These entries identify the central laboratory and the two regional centres named in the Government of India notification. "
    "They are not a nearest-lab locator and do not confirm that a centre accepts farmer service samples. Contact the laboratory or state authority first."
)


def get_testing_pathways(state: str | None = None) -> dict[str, object]:
    selected_state = (state or "").strip()
    normalized_state = " ".join(selected_state.casefold().split())
    centers = [
        {**center, "in_selected_state": bool(normalized_state and normalized_state == center["state"].casefold())}
        for center in CENTERS
    ]
    return {
        "selected_state": selected_state,
        "centers": centers,
        "state_contact_directory": STATE_CONTACT_DIRECTORY,
        "notification_url": CENTRAL_LAB_NOTIFICATION,
        "preparation_steps": PREPARATION_STEPS,
        "note": LIMITATION,
    }
