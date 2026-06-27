/**
 * FinancePulse AI - Natural Language Processor & Virtual Advisor
 */

// 1. Natural Language Transaction Parser
function parseNaturalLanguage(text) {
  const normalized = text.toLowerCase().trim();
  
  // Default parsing values
  let amount = 0;
  let type = 'expense'; // default
  let category = 'Other';
  let description = '';
  let date = new Date().toISOString().split('T')[0]; // default today
  
  // A. Extract Amount
  // Match standard numbers (e.g. 500, 1250.50, 10,000)
  const amountRegex = /(?:rs\.?|inr|rupees|spent|paid|salary|earned)?\s*([\d,]+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees|bucks)?/i;
  const matchAmount = normalized.match(amountRegex);
  if (matchAmount) {
    // Remove commas and parse float
    amount = parseFloat(matchAmount[1].replace(/,/g, ''));
  }
  
  // B. Determine Transaction Type (Income vs Expense)
  const incomeKeywords = ['salary', 'credited', 'earned', 'got', 'received', 'refund', 'bonus', 'freelance', 'income', 'pocket money'];
  const hasIncomeKeyword = incomeKeywords.some(keyword => normalized.includes(keyword));
  if (hasIncomeKeyword) {
    type = 'income';
    category = 'Salary'; // default income category
  }
  
  // C. Determine Category based on keywords
  const categoryKeywords = {
    Food: ['food', 'dining', 'dinner', 'lunch', 'breakfast', 'tea', 'coffee', 'snacks', 'groceries', 'zomato', 'swiggy', 'hotel', 'restaurant', 'cafe', 'milk', 'chicken', 'veg'],
    Rent: ['rent', 'pg', 'flat', 'room', 'housing', 'lease'],
    Bills: ['bill', 'electricity', 'power', 'water', 'wifi', 'internet', 'broadband', 'mobile', 'recharge', 'ott', 'netflix', 'prime', 'subscription', 'gas'],
    Transport: ['petrol', 'fuel', 'diesel', 'cng', 'uber', 'ola', 'auto', 'cab', 'bus', 'train', 'flight', 'metro', 'bike service', 'car wash'],
    Shopping: ['shopping', 'clothes', 'shirt', 'pants', 'shoes', 'dress', 'amazon', 'flipkart', 'myntra', 'gadget', 'phone', 'laptop'],
    Entertainment: ['movie', 'cinema', 'theatre', 'party', 'club', 'pub', 'beer', 'alcohol', 'game', 'gaming', 'ott', 'outing', 'concert'],
    Salary: ['salary', 'salary credited', 'freelance', 'bonus', 'salary transfer', 'interest', 'dividend']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      category = cat;
      break;
    }
  }

  // D. Extract Date offsets (today, yesterday, day before)
  if (normalized.includes('yesterday')) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    date = yesterdayDate.toISOString().split('T')[0];
  } else if (normalized.includes('day before yesterday')) {
    const dbyDate = new Date();
    dbyDate.setDate(dbyDate.getDate() - 2);
    date = dbyDate.toISOString().split('T')[0];
  } else {
    // Look for day names (e.g. "on monday")
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < 7; i++) {
      if (normalized.includes(`on ${days[i]}`)) {
        const targetDay = i;
        const currentDay = new Date().getDay();
        const diff = currentDay >= targetDay ? currentDay - targetDay : 7 - (targetDay - currentDay);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - diff);
        date = targetDate.toISOString().split('T')[0];
        break;
      }
    }
  }

  // E. Create Description (clean text)
  // Remove amounts, dates, and action verbs to keep the core description
  let cleanDesc = text
    .replace(new RegExp(`\\b${amount}\\b`, 'g'), '')
    .replace(/(?:rs\.?|inr|rupees|bucks)/gi, '')
    .replace(/(?:today|yesterday|day before yesterday|on\s+\w+day)/gi, '')
    .replace(/(?:spent|paid|logged|added|credited|received|got|for|on|at|my)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  description = cleanDesc ? cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1) : `${category} Transaction`;

  return { amount, type, category, description, date };
}

// 2. AI Financial Advisor Response Generator
function generateAdvisorResponse(query, transactions = [], budgets = {}) {
  const q = query.toLowerCase().trim();
  
  // Calculate stats for reference
  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpent = {};
  
  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      categorySpent[t.category] = (categorySpent[t.category] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(0) : 0;

  // A. Response logic for "Analyze my spending habits"
  if (q.includes('analyze') || q.includes('spending') || q.includes('habits') || q.includes('report')) {
    if (transactions.length === 0) {
      return "I don't see any transactions registered for this month yet. Once you log some expenses (like food, bills, or transport), I can analyze your spending behavior!";
    }

    let highestCat = 'None';
    let highestAmt = 0;
    for (const [cat, amt] of Object.entries(categorySpent)) {
      if (amt > highestAmt) {
        highestAmt = amt;
        highestCat = cat;
      }
    }

    let response = `Here is your **June Financial Analysis**:\n\n`;
    response += `* **Total Outflow:** You spent a total of **₹${totalExpense.toLocaleString()}**.\n`;
    response += `* **Current Savings Rate:** **${savingsRate}%** (Net Balance: ₹${netBalance.toLocaleString()}). A healthy savings rate is above 20%.\n`;
    
    if (highestAmt > 0) {
      const percentageOfExpense = ((highestAmt / totalExpense) * 100).toFixed(0);
      response += `* **Highest Category:** Your highest spending was in **${highestCat}** with **₹${highestAmt.toLocaleString()}** (representing **${percentageOfExpense}%** of your total expenses).\n\n`;
      
      if (highestCat === 'Food') {
        response += `💡 **Tip:** Food spending can often be optimized. Try planning home-cooked meals for the upcoming week to reduce dining out costs by 15-20%.`;
      } else if (highestCat === 'Shopping') {
        response += `💡 **Tip:** Shopping expenses are often impulse-driven. Try applying the **24-hour rule**: wait 24 hours before buying non-essential items to see if you still need them.`;
      } else if (highestCat === 'Bills') {
        response += `💡 **Tip:** Check if you have duplicate subscriptions (like multiple video streaming apps) that you can pause to save a few hundred rupees.`;
      } else {
        response += `💡 **Tip:** Try reducing non-essential expenditures in ${highestCat} to increase your monthly savings rate.`;
      }
    }
    return response;
  }

  // B. Response logic for "How can I save more?"
  if (q.includes('save') || q.includes('invest') || q.includes('budgeting tips')) {
    let response = `To boost your savings rate this month, try these actionable steps:\n\n`;
    response += `1. **Track everything:** Every small ₹10-20 expense adds up. Keep logging them via the AI input!\n`;
    response += `2. **The 50/30/20 Rule:** Allocate 50% of income to Needs (Rent, Bills, Food), 30% to Wants (Movies, Shopping), and 20% straight to Savings/Investments.\n`;
    
    // Check if there is an actual high expense category to give specific advice
    if (categorySpent['Food'] && categorySpent['Food'] > totalIncome * 0.15) {
      response += `3. Your Food & Dining expense is currently ₹${categorySpent['Food'].toLocaleString()}. Reducing this category by just 10% would save you **₹${(categorySpent['Food'] * 0.1).toFixed(0)}** this month!\n`;
    }
    if (categorySpent['Shopping'] && categorySpent['Shopping'] > totalIncome * 0.1) {
      response += `4. You spent ₹${categorySpent['Shopping'].toLocaleString()} on Shopping. Consider pausing shopping for the next 10 days to increase savings.\n`;
    }
    
    response += `\nWould you like me to analyze any specific category?`;
    return response;
  }

  // C. Response logic for "Check budgets / warnings"
  if (q.includes('budget') || q.includes('limit') || q.includes('warning') || q.includes('over')) {
    let warnings = [];
    
    for (const [category, limit] of Object.entries(budgets)) {
      const spent = categorySpent[category] || 0;
      if (limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 100) {
          warnings.push(`🚨 **${category}** has exceeded its budget! Spent **₹${spent.toLocaleString()}** / ₹${limit.toLocaleString()} (**${pct.toFixed(0)}%** used).`);
        } else if (pct >= 80) {
          warnings.push(`⚠️ **${category}** is close to exceeding its budget! Spent **₹${spent.toLocaleString()}** / ₹${limit.toLocaleString()} (**${pct.toFixed(0)}%** used).`);
        }
      }
    }

    if (warnings.length > 0) {
      return `Here are your current budget alerts:\n\n` + warnings.join('\n') + `\n\nI recommend postponing any non-essential purchases in these categories for the rest of the month.`;
    } else {
      return `Great job! All your category expenditures are currently **well within your set budget limits**. Keep it up!`;
    }
  }

  // D. General helpful fallback response
  return `I've analyzed your question. As your AI financial planner, I can help you monitor expenses, alert you when you approach budget thresholds, and offer budgeting strategies. Try asking me:
  * *"Analyze my spending"*
  * *"How can I save more?"*
  * *"Check my budget warnings"*`;
}
