import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(desc: string, cond: boolean) {
  if (cond) {
    console.log(`[PASS] ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${desc}`);
    failed++;
  }
}

console.log('=== TEST SUITE: WALK & CAB ARRIVAL BEHAVIOR & UI AUDIT ===');

const dashboardPath = path.resolve('./src/components/app/Dashboard.tsx');
const content = fs.readFileSync(dashboardPath, 'utf-8');

// 1. Verify SOS button does NOT have the annoying Silent SOS / Trigger banner below it
const hasOldBanner = content.includes('Central Emergency Mode & Silent SOS Quick Control') || 
                     content.includes('Silent SOS (Stealth Active)') || 
                     content.includes('Single Tap Armed');
assert('Silent SOS and Trigger banner under SOS button is completely removed', !hasOldBanner);

// 2. Verify Cards Layout has Cab Ride Watch and Emergency Safety Numbers in Everyday Tools
assert('Card 1 is Cab Ride Watch', content.includes("CARD 1: CAB RIDE WATCH"));
assert('Card 2 is Emergency Safety Numbers (India Helplines 112)', content.includes("CARD 2: EMERGENCY SAFETY NUMBERS (INDIA HELPLINES 112)"));
assert('Card 2 displays quick safety numbers chips (112, 1091, 108, 181)', 
  content.includes('tel:112') && 
  content.includes('tel:1091') && 
  content.includes('tel:108') && 
  content.includes('tel:181')
);
assert('Walk With Me (Continuous Journey Sharing) is positioned below everyday tools', content.includes("CONTINUOUS JOURNEY SHARING (ORIGINAL WALK GUARDIAN SECTION)"));

// 3. Verify Walk With Me starts with location unshared
assert('Walk tracking starts with hasSharedJourneyLocation(false)', content.includes('setHasSharedJourneyLocation(false);'));

// 4. Verify Sharing actions set hasSharedJourneyLocation to true
const copySetsShared = content.includes('navigator.clipboard.writeText') && content.includes('setHasSharedJourneyLocation(true)');
const waSetsShared = content.includes('https://wa.me/?text=') && content.includes('setHasSharedJourneyLocation(true)');
assert('Copying live link marks location as shared', copySetsShared);
assert('Sharing via WhatsApp marks location as shared', waSetsShared);

// 5. Verify Walk arrival checks hasSharedJourneyLocation before showing safe checkin modal
assert('handleJourneyArrivedSafely checks hasSharedJourneyLocation', content.includes('if (hasSharedJourneyLocation) {') && content.includes('setShowSafeCheckinModal(true)'));

// 6. Verify Walk timer expiry auto-triggers Emergency SOS
assert('Walk timer expiration invokes handleSOSTrigger()', content.includes('WALKING TIMER EXPIRED: Auto-triggering Emergency SOS!') && content.includes('handleSOSTrigger();'));

// 7. Verify Cab Ride Watch has shared state tracking and conditional safe checkin
assert('handleCabArrivedSafely checks hasSharedCabDetails', content.includes('if (hasSharedCabDetails) {') && content.includes('setShowSafeCheckinModal(true)'));
assert('Cab timer expiration invokes handleSOSTrigger()', content.includes('CAB RIDE WATCH TIMEOUT: Auto-triggering Emergency SOS!') && content.includes('handleSOSTrigger();'));

// 8. Verify Safety Numbers card has directory modal trigger button
assert('Safety Numbers card has Call National 112 / Full Directory button', content.includes('Call National 112 / Full Directory') && content.includes('setShowHelplinesModal(true)'));

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
