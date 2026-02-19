
// Simulation of the logic in reels-grid.tsx

const testCases = [
    {
        id: "Test 1: Story Automation",
        data: { media_id: "STORY_AUTOMATION" },
        selectedMedia: { caption: "Original Caption" },
        expected: "Story Automation"
    },
    {
        id: "Test 2: All Media",
        data: { media_id: "ALL_MEDIA" },
        selectedMedia: { caption: "Original Caption" },
        expected: "Any Post"
    },
    {
        id: "Test 3: Next Media",
        data: { media_id: "NEXT_MEDIA" },
        selectedMedia: { caption: "Original Caption" },
        expected: "Next Post"
    },
    {
        id: "Test 4: Specific Media (existing in DB)",
        data: { media_id: "12345" },
        selectedMedia: { caption: "My Cool Reel" },
        expected: "My Cool Reel" // Should use selectedMedia caption
    },
    {
        id: "Test 5: Specific Media (Fallback)",
        data: { media_id: "12345" },
        selectedMedia: { caption: undefined },
        expected: "Untitled Post"
    },
    {
        id: "Test 6: No Match (Undefined media_id in data - likely create mode for specific)",
        data: { media_id: null }, // In create mode for specific, media_id might not be in data yet, but logic uses selectedMedia
        selectedMedia: { caption: "Create Mode Caption" },
        expected: "Create Mode Caption"
    }
];

console.log("Running Caption Logic Verification...\n");

testCases.forEach(test => {
    const { data, selectedMedia } = test;

    // The Logic from reels-grid.tsx
    const media_caption = data.media_id
        ? (data.media_id === "ALL_MEDIA"
            ? "Any Post"
            : (data.media_id === "NEXT_MEDIA"
                ? "Next Post"
                : (data.media_id === "STORY_AUTOMATION"
                    ? "Story Automation"
                    : selectedMedia.caption?.substring(0, 200) || "Untitled Post"
                )
            )
        )
        : selectedMedia.caption?.substring(0, 200);

    const passed = media_caption === test.expected;
    console.log(`${test.id}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!passed) {
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Got:      "${media_caption}"`);
    }
});
