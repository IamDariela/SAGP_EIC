/** All demo mutations check these rules, even when invoked outside the screen. PHP must enforce them in API mode. */
export function can(role, action, subject) {
  if (role === 'admin') return true;
  if (action === 'asset.return' && subject?.type==='weapon' && role==='supervisor')return true;
  if (['asset.save','asset.assign','asset.return','asset.archive','asset.move'].includes(action)) {
    return (subject?.type === 'weapon' && role === 'weapon_manager') || (subject?.type === 'vehicle' && role === 'vehicle_manager') || (subject?.type === 'general' && role === 'inventory_manager');
  }
  const permissions = {
    'location.save':['inventory_manager'], 'person.save':['inventory_manager','supervisor'],
    'bed.assign':['inventory_manager','supervisor'], 'bed.release':['inventory_manager','supervisor'],
    'bed.save':['inventory_manager'], 'bunk.save':['inventory_manager'], 'course.save':['inventory_manager','supervisor'],
    'maintenance.open':['inventory_manager','maintenance_staff'], 'maintenance.close':['inventory_manager','maintenance_staff'],
    'project.save':['buyer'], 'project.status':['buyer'], 'notification.read':['inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','viewer','supervisor','conductor','buyer','teacher'],
    'enrollment.save':['inventory_manager','supervisor'], 'spaceUse.open':['inventory_manager','supervisor','teacher'], 'spaceUse.close':['inventory_manager','supervisor','teacher'],
    'driver.save':['vehicle_manager'], 'trip.open':['vehicle_manager','conductor'], 'trip.close':['vehicle_manager','conductor'],
    'incident.save':['vehicle_manager','conductor'], 'incident.resolve':['maintenance_staff','vehicle_manager'],
    'maintenance.progress':['inventory_manager','maintenance_staff'], 'attachment.add':['inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','buyer'],
    'fund.save':['buyer'], 'allocation.save':['buyer'], 'expense.save':['buyer'], 'import.batch':['inventory_manager','vehicle_manager','supervisor'], 'student.import':['inventory_manager','supervisor']
  };
  return Boolean(permissions[action]?.includes(role));
}
