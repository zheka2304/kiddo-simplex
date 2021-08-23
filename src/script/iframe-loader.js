
window.onload = () => {
	for (let taskIframe of document.getElementsByClassName('task-iframe')) {
		taskIframe.src = encodeURI("task-include?config=assets/scene_config/generic/simplex/" + taskIframe.id + "/task.yaml")
	}
}