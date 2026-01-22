const summaryPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks (prioritizing <h1>, <h2>, <h3>, or <strong>) that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. If <h1>, <h2>, <h3>, or <strong> contain no important sub-landmarks, please disregard them. Sub-landmarks should avoid using complete sentences from the original content, dish names, or emojis. Next, you should format the results as an unordered list (<ul>), with each sub-landmark as a list item (<li>), and retain the original language of the content. Additionally, based on the sub-landmark, look for one contextual clue around it if needed, it can include city or state or country, then fill in <span> for the clue. It's better to select only one key clue for each sub-landmark. But if there is address information, please use the address as a clue. If different sub-landmarks share the same name, you may add a clue in parentheses after the sub-landmark to provide identifiable differences. Only output the following exact structure, replacing the list items as needed:

<ul class="list-group d-flex">
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 1</span>
    <span class="d-none">Clue 1</span>
  </li>
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 2</span>
    <span class="d-none">Clue 2</span>
  </li>
  ...
</ul>

Here is the provided page content:
`;

const attachPrompt = `You are now a place seeker tasked with identifying specific places or landmarks that are important in the page content. Please identify and list the sub-landmarks that are most relevant to the main topic of the page content (marked by the <title>) from the provided page, and do not list irrelevant results. For example, if the main topic suggests a specific number of sub-landmarks, ensure that the identified results align with that expectation. If <h1>, <h2>, <h3>, or <strong> contain no important sub-landmarks, please disregard them. Sub-landmarks should avoid using complete sentence from the original content or description or dish names or containing emojis, please give a specific place name. Retain the original language of the content. Additionally, based on the sub-landmark, look for one contextual clue around it if needed, it can include city or state or country. But if there is address information, please use the address as a clue. Both the sub-landmark name and its corresponding clue must be provided as plain text, with no additional information, emoji or formatting, such as bullet points. Please format the results like this example (the sub-landmark is followed by four spaces and a clue):

sub-landmark-1    clue-1
sub-landmark-2    clue-2
...

Here is the provided page content:
`;

const organizePrompt = `Use your dynamic thinking budget to analyze each location deeply and find the most accurate category. Verify every classification. Organize the provided locations into 2-5 logical categories (from the list below). Respond with a JSON object in this format:

{
  "categories": [
    {
      "name": "Category Name",
      "locations": [
        { "name": "Location Name" }
      ]
    }
  ]
}

Categories:
- Automotive
- Business
- Culture
- Education
- Entertainment and Recreation
- Facilities
- Finance
- Food and Drink
- Geographical Areas
- Government
- Health and Wellness
- Housing
- Lodging
- Natural Features
- Places of Worship
- Services
- Shopping
- Sports
- Transportation
- Other

These are locations from the user's collection that need to be organized (ensure ALL locations are included in your response):
`;

const askAIPrompt = `Suggest or surprise (don't have to be cliché) a {requestedDestination} itinerary, and use {userLocale} as the display language. Please give me the results in plain HTML only (for example, see the format I provided). The clue could be country or city, but not address. The time shows the estimated time and only the number and time unit information. The final format should look like this example (do not include the example or other tags like <h1>):

<ul class="list-group d-flex">
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 1 (time 1)</span>
    <span class="d-none">Clue 1</span>
  </li>
  <li class="list-group-item border rounded mb-3 px-3 summary-list">
    <span>Sub-landmark 2 (time 2)</span>
    <span class="d-none">Clue 2</span>
  </li>
  ...
</ul>
`;

export const geminiPrompts = {
  summary: summaryPrompt,
  attach: attachPrompt,
  organize: organizePrompt,
  askAI: askAIPrompt,
};
