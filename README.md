# Scheduling Workbox System (SWS) API

[![CI](https://github.com/sws2apps/sws2apps-api/actions/workflows/ci.yml/badge.svg)](https://github.com/sws2apps/sws2apps-api/actions/workflows/ci.yml)

Backend service for all SWS applications.

## Open endpoints

### `GET /api/public/source-material/{lang}`

Get active source materials using EPUB file downloaded on the fly from JW.ORG.

#### `lang`

Language code of the materials you want to fetch. Currently, only English (`e`) and Malagasy (`mg`) are supported.

#### Response

```js
[
    {
        "issueDate": "202209",
        "modifiedDateTime": "2022-06-16 16:45:37",
        "weeksCount": 9,
        "mwbYear": "2022",
        "weeksData": [
            {
                "weekDate": "September 5-11",
                "weeklyBibleReading": "1 KINGS 9-10",
                "songFirst": "10",
                "tgw10Talk": "“Praise Jehovah for His Wisdom”: (10 min.)",
                "tgwBRead": "Bible Reading: (4 min.) 1Ki 10:1-13 (th study 5)",
                "ayfCount": 3,
                "ayfPart1": "Initial Call Video: (5 min.) Discussion. Play the video Initial Call: Bible Study​—Ps 37:29. Stop the video at each pause, and ask the audience the questions that appear in the video.",
                "ayfPart2": "Initial Call: (3 min.) Use the sample conversation for the campaign to start Bible studies. (th study 1)",
                "ayfPart3": "Initial Call: (5 min.) Begin with the sample conversation for the campaign to start Bible studies. Start a Bible study in lesson 01 of the Enjoy Life Forever! brochure. (th study 13)",
                "songMiddle": "80",
                "lcCount": 2,
                "lcPart1": "“Find Wisdom for Daily Living on JW.ORG”: (8 min.) Discussion. Encourage the audience to search jw.org when seeking the Bible’s wisdom for day-to-day challenges.",
                "lcPart2": "Local Needs: (7 min.)",
                "lcCBS": "Congregation Bible Study: (30 min.) lff lesson 18 points 6-7 and summary, review, and goal",
                "songConclude": "106"
            },
            ...
        ]
    },
    {
        "issueDate": "202301",
        "modifiedDateTime": "2022-09-30 14:54:02",
        "weeksCount": 9,
        "mwbYear": "2023",
        "weeksData": [
            {
                "weekDate": "January 2-8",
                "weeklyBibleReading": "2 KINGS 22-23",
                "songFirst": "28",
                "tgw10Talk": "“Why Be Humble?”: (10 min.)",
                "tgwBRead": "Bible Reading: (4 min.) 2Ki 23:16-25 (th study 2)",
                "ayfCount": 3,
                "ayfPart1": "Initial Call Video: (5 min.) Discussion. Play the video Initial Call: Prayer​—Ps 65:2. Stop the video at each pause, and ask the audience the questions that appear in the video.",
                "ayfPart2": "Initial Call: (3 min.) Use the sample conversation topic. (th study 1)",
                "ayfPart3": "Initial Call: (5 min.) Begin with the sample conversation topic, and start a Bible study in lesson 01 of the Enjoy Life Forever! brochure. (th study 16)",
                "songMiddle": "120",
                "lcCount": 1,
                "lcPart1": "Humble or Haughty? (Jas 4:6): (15 min.) Discussion. Play the video. Then ask the audience: What is the difference between humility and haughtiness? What can we learn from Moses’ example? Why are you determined to remain humble?",
                "lcCBS": "Congregation Bible Study: (30 min.) lff lesson 33",
                "songConclude": "23"
            },
            ...
        ]
    }
]
```
