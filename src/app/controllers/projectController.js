const express = require("express");
const authMiddleware = require("../middlewares/auth");

const Project = require("../models/project");
const Task = require("../models/task");

const router = express.Router();

router.use(authMiddleware);

async function addTasksToProject(project, tasks = [], removeTasks = false) {
  if (removeTasks) {
    project.tasks = [];
    project.save();
  }

  await Promise.all(
    tasks.map(async (task) => {
      const projectTask = new Task({ ...task, project: project._id });
      await projectTask.save();
      project.tasks.push(projectTask);
    })
  );

  project.save();
}

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().populate("user");
    res.send({ projects });
  } catch (e) {
    res.status(400).send({ error: "Error on listing projects" });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate(
      "user"
    );
    if (!project) {
      return res.status(404).send({ error: "Project not found" });
    }
    res.send({ project });
  } catch (e) {
    res.status(400).send({ error: "Error loading project" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;

    const project = await Project.create({
      title,
      description,
      user: req.userId,
    });

    await addTasksToProject(project, tasks);

    return res.send({ project });
  } catch (err) {
    return res.status(400).send({ error: "Error on creating new project" });
  }
});

router.put("/:projectId", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;

    const project = await Project.findById(req.params.projectId);

    await project.update({ title, description });

    await addTasksToProject(project, tasks, true);

    return res.send({ project });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Error on updating project" });
  }
});

router.delete("/:projectId", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.projectId);
    res.send();
  } catch (e) {
    res.status(400).send({ error: "Error deleting project project" });
  }
});

module.exports = (app) => app.use("/projects", router);
