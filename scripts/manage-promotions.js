#!/usr/bin/env node
// scripts/manage-promotions.js
// Command line tool for managing cloud sync promotions

const readline = require('readline');
const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createPromotion() {
  console.log('\n=== Create New Promotion ===');
  
  const type = await question('Promotion type (e.g., "holiday_sale", "new_feature"): ');
  const title = await question('Title: ');
  const body = await question('Body: ');
  const actionText = await question('Action text (default: "Sync Now"): ') || 'Sync Now';
  const priority = await question('Priority (low/medium/high, default: medium): ') || 'medium';
  const cooldownDays = parseInt(await question('Cooldown days (default: 30): ') || '30');
  const isActive = (await question('Is active? (y/n, default: y): ') || 'y').toLowerCase() === 'y';

  try {
    const response = await fetch(`${API_BASE}/api/promotions/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title,
        body,
        actionText,
        priority,
        cooldownDays,
        isActive
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Promotion created successfully!');
      console.log('ID:', data.promotion.id);
    } else {
      const error = await response.json();
      console.log('❌ Error:', error.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function sendPromotion() {
  console.log('\n=== Send Promotion ===');
  
  const promotionType = await question('Promotion type to send: ');
  const title = await question('Title: ');
  const body = await question('Body: ');
  const actionText = await question('Action text: ');
  const userIds = await question('User IDs (comma-separated, or leave empty for all unsynced users): ');

  const targetUsers = userIds ? userIds.split(',').map(id => id.trim()) : [];

  try {
    const response = await fetch(`${API_BASE}/api/promotions/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promotionType,
        title,
        body,
        actionText,
        userIds: targetUsers
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Promotion sent successfully!');
      console.log('Sent to:', data.sentCount, 'users');
    } else {
      const error = await response.json();
      console.log('❌ Error:', error.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function viewAnalytics() {
  console.log('\n=== Promotion Analytics ===');
  
  const promotionType = await question('Promotion type (or leave empty for all): ');

  try {
    const url = promotionType 
      ? `${API_BASE}/api/promotions/analytics/${promotionType}`
      : `${API_BASE}/api/promotions/analytics`;
      
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 Analytics:');
      console.log('Total Sent:', data.totalSent);
      console.log('Total Clicked:', data.totalClicked);
      console.log('Total Converted:', data.totalConverted);
      console.log('Click Rate:', data.clickRate + '%');
      console.log('Conversion Rate:', data.conversionRate + '%');
      
      if (data.promotions.length > 0) {
        console.log('\nRecent Promotions:');
        data.promotions.slice(0, 10).forEach(p => {
          console.log(`- ${p.type}: Sent ${p.sentAt}, Clicked: ${p.clickedAt || 'No'}, Converted: ${p.convertedAt || 'No'}`);
        });
      }
    } else {
      const error = await response.json();
      console.log('❌ Error:', error.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function main() {
  console.log('🚀 Cloud Sync Promotion Manager');
  console.log('===============================');
  
  while (true) {
    console.log('\nOptions:');
    console.log('1. Create new promotion template');
    console.log('2. Send promotion to users');
    console.log('3. View analytics');
    console.log('4. Exit');
    
    const choice = await question('\nSelect option (1-4): ');
    
    switch (choice) {
      case '1':
        await createPromotion();
        break;
      case '2':
        await sendPromotion();
        break;
      case '3':
        await viewAnalytics();
        break;
      case '4':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid option. Please select 1-4.');
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

main().catch(console.error);
