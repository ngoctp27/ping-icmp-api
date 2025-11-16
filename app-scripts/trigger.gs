function test() {
  monitorAllVPS();
}

function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('monitorAllVPS')
    .timeBased()
    .everyHours(1)
    .create();
}