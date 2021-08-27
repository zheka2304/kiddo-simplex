
window.onload = () => {
	const baseUrl = window.location.protocol + '//' + window.location.host + "/tasks/generic/simplex/";
	for (let taskIframe of document.getElementsByClassName('task-iframe')) {
		taskIframe.src = encodeURI("task-include/" + taskIframe.id + "?config=" + baseUrl + taskIframe.id + "/task.yaml")
	}
}