// Books data structure - similar to LISTENING_AUDIO_URLS pattern
// Each book requires:
// - PDF file uploaded to Supabase: books/pdfs/{category}/{filename}.pdf
// - Cover image uploaded to Supabase: books/covers/{filename}.webp
// Both files should be publicly accessible

const BOOKS_DATA = [
  {
    id: 1,                    // Unique ID (use next available number)
    title: "Atomic Habits", // Book title
    author: "James Clear", // Author name
    description: "Tiny Changes, Remarkable Results", // Brief description (optional but recommended)
    year: 2018,               // Publication year
    pages: 256,                // Number of pages
    category: "selfhelp",        // Category: action, romance, mystery, scifi, educational, biography, selfhelp, fiction
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/atomic-habits-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/selfhelp/atomic-habits.pdf"
  },
  {
    id: 2,                   
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Philosopher's Stone", 
    year: 1997,   
    pages: 222,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-and-the-Philosophers-Stone-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-and-the-Philosophers-Stone.pdf"
  },
  {
    id: 3,                   
    title: "Harry Potter and the Chamber of Secrets",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Chamber of Secrets", 
    year: 1998,   
    pages: 251,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-and-the-Chamber-of-Secrets-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-and-the-Chamber-of-Secrets.pdf"
  },
  {
    id: 4,                   
    title: "Harry Potter and the Prisoner of Azkaban",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Prisoner of Azkaban", 
    year: 1999,
    pages: 379,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-and-the-Prisoner-of-Azkaban-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-and-the-Prisoner-of-Azkaban.pdf"
  },
  {
    id: 5,                   
    title: "Harry Potter and the Goblet of Fire",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Goblet of Fire", 
    year: 2000,
    pages: 475,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-And-The-Goblet-Of-Fire-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-And-The-Goblet-Of-Fire.pdf"
  },
  {
    id: 6,                   
    title: "Harry Potter and the Order of the Phoenix",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Order of the Phoenix", 
    year: 2003,
    pages: 767,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-and-the-Order-of-Phoenix-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-and-the-Order-of-Phoenix.pdf"
  },
  {
    id: 7,                   
    title: "Harry Potter and the Half-Blood Prince",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Half-Blood Prince", 
    year: 2005,
    pages: 607,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-and-the-Half-Blood-Prince-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-and-the-Half-Blood-Prince.pdf"
  },
  {
    id: 8,                   
    title: "Harry Potter and the Deathly Hallows",
    author: "J.K. Rowling", 
    description: "Harry Potter and the Deathly Hallows", 
    year: 2007,
    pages: 607,
    category: "fiction",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Harry-Potter-And-The-Deathly-Hallows-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/fiction/Harry-Potter-And-The-Deathly-Hallows.pdf"
  },
  {
    id: 9,                 
    title: "The Hunger Games",
    author: "Suzanne Collins", 
    description: "The story is set in a post-apocalyptic world where the government of the United States of America is ruled by a totalitarian regime. The story follows the journey of Katniss Everdeen, a young woman who volunteers to take the place of her sister in the Hunger Games, a televised competition in which twenty-four teenagers are forced to fight to the death.", 
    year: 2008,
    pages: 519,
    category: "action",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/hunger-games-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/action/hunger-games.pdf"
  },
  {
    id: 10,                 
    title: "The Martian",
    author: "Andy Weir", 
    description: "The story follows the journey of Mark Watney, a botanist who is left behind on Mars after a catastrophic dust storm forces the immediate evacuation of the crew. He must use his ingenuity and resourcefulness to survive on the hostile planet while waiting for rescue.", 
    year: 2011,
    pages: 333,
    category: "action",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/The-Martian-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/action/The-Martian.pdf"
  },
  {
    id: 11,                 
    title: "It Ends With Us",
    author: "Colleen Hoover", 
    description: "The story follows the journey of Lily Bloom, a young woman who is forced to confront her past when she meets her ex-boyfriend's new girlfriend. The story explores the themes of love, friendship, and the importance of living life to the fullest.", 
    year: 2016,
    pages: 384,
    category: "romance",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Preview-It-Ends-With-Us-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/romance/Preview-It-Ends-With-Us.pdf"
  },
  {
    id: 12,                 
    title: "Me Before You",
    author: "Jojo Moyes", 
    description: "The story follows the journey of Louisa Clark, a young woman who is hired to care for a man who is paralyzed from the neck down. The story explores the themes of love, friendship, and the importance of living life to the fullest.", 
    year: 2012,
    pages: 393,
    category: "romance",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/Me-Before-You-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/romance/Me-Before-You.pdf"
  },
  {
    id: 13,                 
    title: "A mysterious world",
    author: "The Teacher's Magazine", 
    description: "The story is a collection of articles about the mysterious world of the teacher's magazine. The articles are written by teachers and cover a wide range of topics, from teaching methods to classroom management. The articles are written in a clear and concise style, and are easy to understand.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/A-mysterious-world-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/A-mysterious-world.pdf"
  },
  {
    id: 14,                 
    title: "100 Issue",
    author: "The Teacher's Magazine", 
    description: "A special commemorative issue celebrating 100 editions of The Teacher's Magazine. This collection features highlights from past issues, innovative teaching strategies, and insights from experienced educators. Perfect for teachers seeking inspiration and practical classroom ideas.", 
    year: 2015,
    pages: 30,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-100-issue-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-100-issue.pdf"
  },
  {
    id: 15,                 
    title: "Animals Everywhere",
    author: "The Teacher's Magazine", 
    description: "An engaging educational resource focused on teaching about animals and wildlife. This issue provides lesson plans, activities, and worksheets designed to help students learn about different animal species, habitats, and conservation. Ideal for primary and elementary educators.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Animals-everywhere-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Animals-everywhere.pdf"
  },
  {
    id: 16,                 
    title: "Argentina",
    author: "The Teacher's Magazine", 
    description: "A comprehensive teaching resource about Argentina, its culture, geography, and history. This issue includes lesson plans, cultural activities, and educational materials to help students explore this fascinating South American country. Perfect for geography and social studies classes.", 
    year: 2014,
    pages: 28,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Argentina-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Argentina.pdf"
  },
  {
    id: 17,                 
    title: "At the Hospital",
    author: "The Teacher's Magazine", 
    description: "Educational materials designed to teach students about hospitals, healthcare, and medical professions. This issue provides vocabulary exercises, role-play scenarios, and activities that help students understand healthcare settings while improving their language skills.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-At-the%20hospital-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-At-the-hospital.pdf"
  },
  {
    id: 18,                 
    title: "Christmas",
    author: "The Teacher's Magazine", 
    description: "A festive collection of Christmas-themed lesson plans, activities, and worksheets. This holiday issue includes crafts, songs, stories, and cultural activities to celebrate Christmas in the classroom. Perfect for engaging students during the holiday season.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Christmas-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Christmas.pdf"
  },
  {
    id: 19,                 
    title: "Countries in the America",
    author: "The Teacher's Magazine", 
    description: "An educational resource exploring the diverse countries of the Americas. This issue covers geography, culture, history, and traditions of various nations across North, Central, and South America. Includes maps, activities, and comparative exercises for geography and social studies.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Countries-in-the-America-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Countries-in-the-America.pdf"
  },
  {
    id: 20,                 
    title: "Halloween Issue",
    author: "The Teacher's Magazine", 
    description: "A spooky collection of Halloween-themed teaching materials. This special issue includes scary stories, costume ideas, vocabulary exercises, and fun activities to celebrate Halloween in the classroom. Perfect for engaging students with seasonal content while maintaining educational value.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Halloween-issue-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Halloween-issue.pdf"
  },
  {
    id: 21,                 
    title: "Hide and Seek",
    author: "The Teacher's Magazine", 
    description: "Interactive teaching materials based on the classic game of hide and seek. This issue provides creative lesson plans that incorporate movement, vocabulary building, and problem-solving activities. Ideal for young learners and kinesthetic learning approaches.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Hide-and%20seek-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Hide-and-seek.pdf"
  },
  {
    id: 22,                 
    title: "Houses",
    author: "The Teacher's Magazine", 
    description: "Educational content focused on different types of houses and homes around the world. This issue explores architecture, cultural differences in housing, and vocabulary related to homes. Includes activities, worksheets, and project ideas for teaching about living spaces and communities.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Houses-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Houses.pdf"
  },
  {
    id: 23,                 
    title: "Lesson Plans on Traditional Stories",
    author: "The Teacher's Magazine", 
    description: "A comprehensive collection of lesson plans based on traditional stories, folktales, and fairy tales from around the world. This issue provides ready-to-use teaching materials that help students explore cultural heritage, develop reading comprehension, and engage with classic narratives.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Lesson-plans-on-traditional-stories-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Lesson-plans-on-traditional-stories.pdf"
  },
  {
    id: 24,                 
    title: "Let's Go on a Bear Hunt",
    author: "The Teacher's Magazine", 
    description: "Teaching materials inspired by the popular children's story 'We're Going on a Bear Hunt'. This issue includes interactive activities, movement exercises, vocabulary building, and storytelling techniques. Perfect for engaging young learners with action-based learning and narrative skills.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Let's-go-on-a-bear-hunt-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Let's-go-on-a-bear-hunt.pdf"
  },
  {
    id: 25,                 
    title: "Material Complementario",
    author: "The Teacher's Magazine", 
    description: "Supplementary teaching materials and resources for educators. This issue provides additional worksheets, activities, and teaching aids to complement main curriculum materials. Designed to support teachers with extra resources for reinforcement, extension, and differentiated instruction.", 
    year: 2014,
    pages: 87,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Material-complementario-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Material-complementario.pdf"
  },
  {
    id: 26,                 
    title: "Natural Disasters",
    author: "The Teacher's Magazine", 
    description: "Educational materials about natural disasters, their causes, effects, and safety measures. This issue covers earthquakes, floods, hurricanes, and other natural phenomena with age-appropriate content. Includes science activities, vocabulary exercises, and safety education resources.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Natural-disasters-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Natural-disasters.pdf"
  },
  {
    id: 27,                 
    title: "Non-Violence",
    author: "The Teacher's Magazine", 
    description: "Teaching resources focused on promoting peace, conflict resolution, and non-violent communication. This issue provides lesson plans and activities that help students understand the importance of peaceful solutions, empathy, and respectful dialogue. Ideal for character education and social-emotional learning.", 
    year: 2014,
    pages: 29,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Non-violance-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Non-violance.pdf"
  },
  {
    id: 28,                 
    title: "Opposites",
    author: "The Teacher's Magazine", 
    description: "Educational materials designed to teach opposites and antonyms to young learners. This issue includes engaging activities, games, and worksheets that help students understand contrasting concepts. Perfect for vocabulary building and language development in early education.", 
    year: 2014,
    pages: 30,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Opposites-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Opposites.pdf"
  },
  {
    id: 29,                 
    title: "Play to Recycle",
    author: "The Teacher's Magazine", 
    description: "Environmental education materials focused on recycling and sustainability. This issue provides fun, hands-on activities that teach students about waste reduction, recycling processes, and environmental responsibility. Includes craft projects, games, and lesson plans that make learning about ecology engaging.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Play-to-recycle-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Play-to-recycle.pdf"
  },
  {
    id: 30,                 
    title: "Reported Speech",
    author: "The Teacher's Magazine", 
    description: "Grammar-focused teaching materials for reported speech and indirect speech. This issue provides clear explanations, practice exercises, and engaging activities to help students master this important grammatical structure. Includes worksheets, games, and interactive lesson plans for language teachers.", 
    year: 2014,
    pages: 30,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Reported-speech-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Reported-speech.pdf"
  },
  {
    id: 31,                 
    title: "Robots",
    author: "The Teacher's Magazine", 
    description: "STEM-focused educational materials about robots and technology. This issue explores robotics, automation, and artificial intelligence in an accessible way for students. Includes science activities, vocabulary exercises, and project ideas that combine technology education with language learning.", 
    year: 2014,
    pages: 32,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Robots-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Robots.pdf"
  },
  {
    id: 32,                 
    title: "Survival",
    author: "The Teacher's Magazine", 
    description: "Adventure-themed teaching materials focused on survival skills and outdoor education. This issue provides engaging content about wilderness survival, problem-solving, and resourcefulness. Includes activities, vocabulary exercises, and project-based learning ideas that combine adventure themes with educational objectives.", 
    year: 2014,
    pages: 29,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Survival-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Survival.pdf"
  },
  {
    id: 33,                 
    title: "The World Cup",
    author: "The Teacher's Magazine", 
    description: "Sports-themed educational materials about the FIFA World Cup and international football. This issue explores the history, culture, and excitement of the world's biggest sporting event. Includes geography activities, cultural studies, and vocabulary exercises that engage students through their interest in sports.", 
    year: 2014,
    pages: 36,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-The-world%20cup-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-The-world-cup.pdf"
  },
  {
    id: 34,                 
    title: "Welcome Back",
    author: "The Teacher's Magazine", 
    description: "Back-to-school resources and activities for the beginning of the academic year. This issue provides icebreaker activities, classroom management tips, and engaging first-week lesson plans. Perfect for teachers starting a new school year and looking for fresh ideas to welcome students back.", 
    year: 2014,
    pages: 29,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-Welcome-back-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-Welcome-back.pdf"
  },
  {
    id: 35,                 
    title: "What Should I Put On",
    author: "The Teacher's Magazine", 
    description: "Clothing and fashion-themed educational materials for language learning. This issue focuses on vocabulary related to clothing, weather-appropriate dressing, and daily routines. Includes activities, role-plays, and worksheets that help students learn about clothing while developing language skills.", 
    year: 2014,
    pages: 29,
    category: "teachersmagazine",
    coverUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/covers/teachersmagazine/TTM-What-should-I-put-on-cover.webp",
    pdfUrl: "https://hbxcdfuqgxkwvztxkqqd.supabase.co/storage/v1/object/public/books/books/pdfs/teachersmagazine/TTM-What-should-I-put-on.pdf"
  },
];

export { BOOKS_DATA };

