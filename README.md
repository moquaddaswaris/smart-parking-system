parking-system/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── parking/
│   └── dashboard/
│
├── backend/
│   ├── main.py
│   ├── routes/
│   │   ├── parking.py
│   │   ├── cameras.py
│   │   └── statistics.py
│   │
│   ├── models/
│   ├── services/
│   │   ├── detection.py
│   │   └── parking.py
│   │
│   └── database.py
│
├── computer_vision/
│   ├── detector.py
│   ├── parking_detector.py
│   ├── camera.py
│   └── config.py
│
└── README.md


             ┌─────────────────────┐
             │     PARKING LOT     │
             │       50 SLOTS      │
             └──────────┬──────────┘
                        │
                   CCTV / IP CAM
                        │
                        ▼
              ┌──────────────────┐
              │   OpenCV + YOLO  │
              │                  │
              │ Vehicle Detection│
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Parking Engine   │
              │                  │
              │ P01 = EMPTY      │
              │ P02 = OCCUPIED   │
              │ ...              │
              │ P50 = EMPTY      │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │     FastAPI      │
              │ REST + WebSocket │
              └───────┬──────────┘
                      │
             ┌────────┴─────────┐
             ▼                  ▼
        ┌──────────┐       ┌──────────┐
        │ MongoDB  │       │ Next.js  │
        │          │       │ Web App  │
        └──────────┘       └────┬─────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │ Parking Dashboard│
                     │                  │
                     │ 50 Total         │
                     │ 32 Occupied      │
                     │ 18 Available     │
                     │                  │
                     │ P01 🟢 P02 🔴    │
                     │ P03 🟢 P04 🟢    │
                     └──────────────────┘

                                      50 PARKING SLOTS
                       │
              ┌────────┴────────┐
              │                 │
         MAG SENSOR 1      MAG SENSOR 2
              │                 │
              └────────┬────────┘
                       │
                     ESP32
                       │
                     Wi-Fi
                       │
                       ▼
                    FastAPI
                       │
              ┌────────┴────────┐
              ▼                 ▼
           MongoDB          WebSocket
                                │
                                ▼
                         NEXT.JS WEB APP
                                │
                     ┌──────────┴──────────┐
                     │                     │
                  P01 🟢                P02 🔴
                  P03 🟢                P04 🟢
                  ...                   P50 🔴



# New Idea
parking_slots = {
    1: (x1, y1, x2, y2),
    2: (x1, y1, x2, y2),
    ...
    19: (x1, y1, x2, y2)
}

Camera image
     ↓
YOLO detects cars
     ↓
Compare car position with each parking region
     ↓
Slot 1 = occupied
Slot 2 = empty
...

Frontend
React / Next.js
Tailwind CSS

Backend
FastAPI

Computer Vision
Python
OpenCV
YOLO

Database
SQLite initially

# API design
{
  "total": 19,
  "occupied": 12,
  "available": 7,
  "slots": [
    {"id": 1, "occupied": false},
    {"id": 2, "occupied": true},
    {"id": 3, "occupied": false}
  ]
}

Add history — this will make the project stronger
Don't only show current occupancy.

Store something like:

Time       Occupied    Available
10:00         5           14
10:30         8           11
11:00        12            7
11:30        15            4



100% ┤              ╭──╮
 75% ┤         ╭────╯  ╰──╮
 50% ┤    ╭────╯           ╰─
 25% ┤────╯
     └────────────────────────
       10AM  11AM  12PM  1PM


                     SMART PARKING
       Real-Time Parking Occupancy

     ┌─────────┐ ┌─────────┐ ┌─────────┐
     │ TOTAL   │ │OCCUPIED │ │AVAILABLE│
     │   19    │ │    12   │ │    7    │
     └─────────┘ └─────────┘ └─────────┘


              PARKING MAP

       01 🟢    02 🔴    03 🟢
       04 🔴    05 🔴    06 🟢
       07 🟢    08 🔴    09 🟢
       10 🔴    11 🟢    12 🔴
       13 🟢    14 🔴    15 🟢
       16 🔴    17 🟢    18 🟢
       19 🔴


        Occupancy: 63.2%

        ─────────────────────

        Today's Occupancy
        [ graph ]

        Last updated: 20:09:32

        My biggest tip: because there are only 19 spaces, focus on making the actual parking visualization accurate and polished rather than adding dozens of features. A clean 19-slot live map + reliable detection + history will make a much stronger project than a complicated dashboard with unreliable detection.


# I would build it in this order
Step 1: Create Next.js project
↓
Step 2: Create dashboard layout
↓
Step 3: Create 19 parking-slot components
↓
Step 4: Add dummy occupied/empty states
↓
Step 5: Make the parking map look like your actual parking layout
↓
Step 6: Add responsive/mobile design
↓
Step 7: Build FastAPI backend
↓
Step 8: Connect YOLO detection → FastAPI → frontend

┌──────────────────────────────────────────────────┐
│  SMART PARKING                    LIVE ●          │
│  RGIPT Parking Management                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  TOTAL          OCCUPIED          AVAILABLE      │
│   19              4                  15          │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│                 PARKING MAP                      │
│                                                  │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│  │01│ │02│ │03│ │04│ │05│ │06│ │07│             │
│  │🟢│ │🟢│ │🟢│ │🔴│ │🔴│ │🟢│ │🟢│             │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘             │
│                                                  │
│              ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│              │08│ │09│ │10│ │11│                │
│              │🔴│ │🟢│ │🟢│ │🟢│                │
│              └──┘ └──┘ └──┘ └──┘                │
│                                                  │
│  ...                                            │
│                                                  │
├──────────────────────────────────────────────────┤
│  Occupancy: 21.1%       Last updated: 20:32      │
└──────────────────────────────────────────────────┘
