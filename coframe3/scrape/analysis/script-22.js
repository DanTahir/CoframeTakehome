
document.addEventListener("DOMContentLoaded", function() {
  // List of names
  const names = ["James", "Josh", "Liam", "Oliver", "Noah", "William", "Ben", "Henry", "Alex", 
                 "Olivia", "Emma", "Sarah", "Elizabeth", "Laura", "Anna", "Rachel", "Rebecca", "Jessica"];
  
  // Get all instances of .cursor-animation
  const cursorAnimations = document.querySelectorAll('.cursor-animation');

  // Loop through each .cursor-animation instance
  cursorAnimations.forEach(cursorAnimation => {
    // Find all instances of .cursor[data-is-coframe-cursor="false"] within this .cursor-animation
    const cursors = cursorAnimation.querySelectorAll('.cursor[data-is-coframe-cursor="false"]');
    
    if (cursors.length > 0) {
      // Pick a random name from the list
      const randomName = names[Math.floor(Math.random() * names.length)];

      // Set the same random name to #cursor__text for all matching cursors
      cursors.forEach(cursor => {
        const cursorTextElement = cursor.querySelector('#cursor__text');
        if (cursorTextElement) {
          cursorTextElement.textContent = randomName;
        }
      });
    }
  });
});
