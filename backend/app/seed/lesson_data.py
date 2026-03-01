"""
Five Grade 3 Math micro-lessons with educational MDX content.
Each lesson targets a Common Core standard and includes misconception
tags that drive the Quiz Agent and Feedback Agent pipelines.
"""

SEED_LESSONS = [
    # ------------------------------------------------------------------
    # Lesson 1: Understanding Fractions
    # CC: 3.NF.A.1 — Understand a fraction as a part of a whole
    # ------------------------------------------------------------------
    {
        "title": "Understanding Fractions",
        "subject": "Mathematics",
        "grade_level": 3,
        "prerequisite_titles": [],  # standalone — first lesson in fractions path
        "misconception_tags": [
            "fraction-as-two-numbers",
            "denominator-confusion",
            "whole-vs-part",
        ],
        "content_mdx": """## What Is a Fraction?

A fraction tells us about **equal parts** of a whole. When we cut a pizza into 4 equal slices and eat 1 slice, we have eaten **1/4** of the pizza.

The number on the **bottom** is called the **denominator**. It tells us how many equal parts the whole is divided into. The number on the **top** is called the **numerator**. It tells us how many parts we are talking about.

## Reading Fractions

When we see **3/4**, we say "three fourths." The denominator (4) means the whole is split into 4 equal pieces. The numerator (3) means we are looking at 3 of those pieces.

**Important:** A fraction is ONE number, not two separate numbers. 3/4 does not mean "3 and 4." It means "3 out of 4 equal parts."

## Fractions of a Shape

Imagine a rectangle divided into 3 equal columns. If we color 2 columns, the colored part is **2/3** of the rectangle.

To find a fraction of a shape:

1. Count the **total** equal parts (this is the denominator).
2. Count the **colored** parts (this is the numerator).
3. Write the fraction as numerator/denominator.

## Fractions on a Number Line

We can also show fractions on a number line. The space between 0 and 1 is one whole. If we divide that space into 4 equal segments, each mark represents 1/4.

- The first mark is **1/4**
- The second mark is **2/4** (which is the same as 1/2)
- The third mark is **3/4**
- The fourth mark is **4/4** (which equals 1 whole)

## Key Takeaway

A fraction describes a **part of a whole**. The denominator tells you how many equal pieces, and the numerator tells you how many of those pieces you have. Always remember: the parts must be **equal**!
""",
    },
    # ------------------------------------------------------------------
    # Lesson 2: Introduction to Multiplication
    # CC: 3.OA.A.1 — Interpret products of whole numbers
    # ------------------------------------------------------------------
    {
        "title": "Introduction to Multiplication",
        "subject": "Mathematics",
        "grade_level": 3,
        "prerequisite_titles": [],  # standalone — entry point for operations path
        "misconception_tags": [
            "multiplication-as-addition",
            "commutative-confusion",
            "zero-property-error",
        ],
        "content_mdx": """## What Is Multiplication?

Multiplication is a fast way to add the **same number** many times. Instead of writing 4 + 4 + 4, we can write **3 × 4 = 12**. This means "3 groups of 4."

Think of it like this: if you have 3 bags and each bag has 4 apples, you have 3 × 4 = 12 apples in total.

## Groups and Arrays

An **array** is a way to arrange objects in equal rows and columns. If you place 3 rows of 5 stars, you can count them by multiplying: 3 × 5 = 15.

Arrays help us see that multiplication makes equal groups:

- 2 × 6 means 2 rows of 6
- 4 × 3 means 4 rows of 3
- 5 × 5 means 5 rows of 5

## The Commutative Property

Here is a cool rule: **the order does not matter** when you multiply! 3 × 4 gives the same answer as 4 × 3. Both equal 12.

This is called the **commutative property**. It works every time:

- 2 × 7 = 7 × 2 = 14
- 5 × 3 = 3 × 5 = 15

**Be careful:** Even though the answer is the same, the picture can look different. 3 groups of 4 looks different from 4 groups of 3, but both total 12.

## Multiplying by 0 and 1

Two special rules to remember:

- **Any number times 0 equals 0.** If you have 5 bags with 0 apples each, you have no apples! 5 × 0 = 0.
- **Any number times 1 equals that number.** If you have 1 group of 7, you just have 7. 7 × 1 = 7.

## Key Takeaway

Multiplication is repeated addition of equal groups. The commutative property lets you swap the numbers. And remember: zero times anything is always zero!
""",
    },
    # ------------------------------------------------------------------
    # Lesson 3: Telling Time
    # CC: 3.MD.A.1 — Tell and write time to the nearest minute
    # ------------------------------------------------------------------
    {
        "title": "Telling Time",
        "subject": "Mathematics",
        "grade_level": 3,
        "prerequisite_titles": [],  # standalone — measurement path entry point
        "misconception_tags": [
            "hour-minute-swap",
            "analog-digital-mismatch",
            "12hr-24hr-confusion",
        ],
        "content_mdx": """## The Two Hands of a Clock

An analog clock has two hands:

- The **short hand** points to the **hour**.
- The **long hand** points to the **minutes**.

A common mistake is mixing them up. Remember: the **short** hand is for **hours** because hours are bigger chunks of time. The **long** hand is for **minutes** because it needs to point precisely at small marks.

## Reading the Hour

The short hand moves slowly from one number to the next. When it points directly at the 3, the hour is **3 o'clock**. When it is between 3 and 4, the hour is still **3** (the hour does not change until the hand reaches the next number).

## Reading the Minutes

The long hand moves around the whole clock face. The clock has 60 tiny marks, one for each minute. When the long hand points to the 12, the minutes are **:00**. Each big number on the clock represents 5 minutes:

- 12 = :00
- 1 = :05
- 2 = :10
- 3 = :15 (quarter past)
- 6 = :30 (half past)
- 9 = :45 (quarter to)

## Analog vs. Digital

A digital clock shows time as numbers like **3:25**. The number before the colon is the hour, and the number after is the minutes.

Both clocks show the same time, just in different ways:

- Analog clock with short hand on 3 and long hand on 5 = Digital **3:25**
- Analog clock with short hand on 7 and long hand on 12 = Digital **7:00**

## AM and PM

Each day has 24 hours, but clocks only show 12 numbers:

- **AM** is from midnight (12:00 AM) to just before noon.
- **PM** is from noon (12:00 PM) to just before midnight.

So 8:00 AM is morning, and 8:00 PM is evening. They look the same on the clock, but happen at different times of day!

## Key Takeaway

The short hand tells the hour, the long hand tells the minutes. Learn to connect what you see on an analog clock to the numbers on a digital clock. Use AM and PM to tell morning from evening.
""",
    },
    # ------------------------------------------------------------------
    # Lesson 4: Measurement and Units
    # CC: 3.MD.B.4 — Measure lengths using rulers
    # ------------------------------------------------------------------
    {
        "title": "Measurement and Units",
        "subject": "Mathematics",
        "grade_level": 3,
        "prerequisite_titles": ["Telling Time"],  # builds on time/units concepts
        "misconception_tags": [
            "unit-mismatch",
            "ruler-start-at-one",
            "estimation-error",
        ],
        "content_mdx": """## What Is Measurement?

Measurement is how we find the **length, width, or height** of an object. We use tools like a **ruler** to measure. The ruler tells us how long something is by using units.

There are two common systems of units:

- **Inches** — used in the United States (customary system)
- **Centimeters** — used in most countries and in science (metric system)

## Using a Ruler

A ruler has numbers and small marks along one edge. To measure correctly:

1. Line up the **zero mark** (the very start of the ruler) with one end of the object.
2. Look at where the other end of the object reaches.
3. Read the number at that point — that is the length!

**Common mistake:** Some students start measuring at the number 1 instead of the zero mark. This adds an extra unit to every measurement and gives the wrong answer.

## Inches and Centimeters

Inches are **bigger** units. One inch is about the width of your thumb. Centimeters are **smaller** units. It takes about 2.5 centimeters to equal 1 inch.

For example, a pencil might be 7 inches long but 18 centimeters long. Both measurements describe the same pencil!

## Choosing the Right Unit

Bigger objects are measured in **feet, yards, or meters**. Smaller objects are measured in **inches or centimeters**.

Think about which unit makes sense:

- A paper clip → about 3 centimeters (not 3 meters!)
- A classroom → about 10 meters (not 10 centimeters!)
- A door → about 2 meters tall or 7 feet tall

**Estimation tip:** Before measuring, make a guess. Is the object closer to 1 inch or 10 inches? Estimating helps you check if your answer is reasonable.

## Key Takeaway

Measurement tells us how long something is using units like inches or centimeters. Always start at the zero mark on the ruler, not the 1. Choose units that fit the size of the object you are measuring.
""",
    },
    # ------------------------------------------------------------------
    # Lesson 5: Introduction to Division
    # CC: 3.OA.A.2 — Interpret whole-number quotients
    # ------------------------------------------------------------------
    {
        "title": "Introduction to Division",
        "subject": "Mathematics",
        "grade_level": 3,
        "prerequisite_titles": ["Introduction to Multiplication"],  # division requires multiplication knowledge
        "misconception_tags": [
            "division-as-subtraction",
            "remainder-confusion",
            "dividend-divisor-swap",
        ],
        "content_mdx": """## What Is Division?

Division is about **sharing equally**. If you have 12 cookies and want to share them equally among 3 friends, you would divide: **12 ÷ 3 = 4**. Each friend gets 4 cookies.

The number being divided is called the **dividend** (12). The number you divide by is called the **divisor** (3). The answer is called the **quotient** (4).

## Equal Sharing

Think of division as putting objects into equal groups:

- 15 ÷ 5 means: put 15 objects into 5 equal groups. How many in each group? → 3
- 20 ÷ 4 means: put 20 objects into 4 equal groups. How many in each group? → 5
- 8 ÷ 2 means: put 8 objects into 2 equal groups. How many in each group? → 4

Division always splits the total into **equal** parts.

## Division and Multiplication Are Related

Division is the **opposite** of multiplication. If you know your multiplication facts, you already know division facts!

- If 3 × 4 = 12, then 12 ÷ 3 = 4 and 12 ÷ 4 = 3
- If 5 × 6 = 30, then 30 ÷ 5 = 6 and 30 ÷ 6 = 5

This relationship is called **fact families**. Learning one fact gives you four related facts.

## Remainders

Sometimes objects cannot be divided perfectly equally. If you have 13 cookies and 3 friends, each friend gets 4 cookies — but 1 cookie is left over. That leftover is called the **remainder**.

We write this as: **13 ÷ 3 = 4 remainder 1**, or **4 R1**.

**Important:** The remainder is always **smaller** than the divisor. If the remainder were 3 or more, you could give one more to each group!

## Key Takeaway

Division means sharing a total equally into groups. The dividend is what you start with, the divisor is the number of groups, and the quotient is how many are in each group. Use multiplication facts to help with division, and watch for remainders when things don't divide evenly.
""",
    },
]
