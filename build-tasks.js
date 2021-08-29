const fs = require('fs');
const path = require('path');
const TsNode = require('ts-node');
const yaml = require('js-yaml');

const ts = TsNode.create({
	transpileOnly: true,
});

function buildTaskSource(srcPath) {
	return ts.compile(fs.readFileSync(srcPath, 'utf-8'), srcPath);
}

function buildTask(srcPath, yamlPath, outputPath) {
	let source = null;
	try {
		source = buildTaskSource(srcPath);
	} catch (e) {
		console.error(e.toString())
		return false;
	}

	config = yaml.load(fs.readFileSync(yamlPath, 'utf-8'));
	config.generatingFunc = source;
	fs.writeFileSync(outputPath, JSON.stringify(config, 4), 'utf-8');
}

(async function build() {
	const taskDirPath = 'src/tasks/generic/simplex';
	const taskDir = fs.readdirSync(taskDirPath);
	taskDir.forEach((file, index) => {
		try {
			console.log('compiling ' + file);
			file = path.join(taskDirPath, file);
			buildTask(path.join(file, 'task.ts'), path.join(file, 'task.yaml'), path.join(file, 'task-prod.yaml'))
		} catch (e) {
			console.error(e);
		}
	});
	// 
})();

