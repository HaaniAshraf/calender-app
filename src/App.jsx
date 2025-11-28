import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

// Utility functions
const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

const isDateInRange = (date, start, end) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
};

const getCategoryColor = (category) => {
  const colors = {
    'To Do': 'bg-blue-500',
    'In Progress': 'bg-yellow-500',
    'Review': 'bg-purple-500',
    'Completed': 'bg-green-500'
  };
  return colors[category];
};

const TaskPlanner = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [dragSelection, setDragSelection] = useState({ startDate: null, endDate: null });
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [taskName, setTaskName] = useState('');
  const [taskCategory, setTaskCategory] = useState('To Do');

  // Drag task state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizingTask, setResizingTask] = useState(null);

  // Filters
  const [categoryFilters, setCategoryFilters] = useState(new Set(['To Do', 'In Progress', 'Review', 'Completed']));
  const [timeFilter, setTimeFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const calendarRef = useRef(null);

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Handle drag selection for creating tasks
  const handleMouseDown = (date, e) => {
    if (!date || e.button !== 0) return;
    if (e.target.closest('.task-bar')) return;

    setIsDragging(true);
    setDragSelection({ startDate: date, endDate: date });
  };

  const handleMouseEnter = (date) => {
    if (!isDragging || !date || !dragSelection.startDate) return;
    setDragSelection(prev => ({ ...prev, endDate: date }));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragSelection.startDate && dragSelection.endDate) {
      const start = dragSelection.startDate < dragSelection.endDate ? dragSelection.startDate : dragSelection.endDate;
      const end = dragSelection.startDate > dragSelection.endDate ? dragSelection.startDate : dragSelection.endDate;

      setModalData({ startDate: start, endDate: end });
      setShowModal(true);
    }

    setDragSelection({ startDate: null, endDate: null });
  };

  const createTask = () => {
    if (!modalData || !taskName.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      name: taskName.trim(),
      category: taskCategory,
      startDate: modalData.startDate,
      endDate: modalData.endDate
    };

    setTasks([...tasks, newTask]);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
    setTaskName('');
    setTaskCategory('To Do');
  };

  // Task drag handlers
  const handleTaskMouseDown = (task, e, edge) => {
    e.stopPropagation();

    if (edge) {
      setResizingTask({ task, edge });
    } else {
      setDraggedTask(task);
      const taskElement = e.target.closest('.task-bar');
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        setDragOffset(e.clientX - rect.left);
      }
    }
  };

  const handleTaskDrag = (e) => {
    if (draggedTask && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const cellWidth = rect.width / 7;
      const x = e.clientX - rect.left;
      const dayIndex = Math.floor(x / cellWidth);

      if (dayIndex >= 0 && dayIndex < days.length && days[dayIndex]) {
        const newStartDate = days[dayIndex];
        const duration = Math.floor((draggedTask.endDate.getTime() - draggedTask.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + duration);

        setTasks(tasks.map(t => t.id === draggedTask.id ? { ...t, startDate: newStartDate, endDate: newEndDate } : t));
      }
    }

    if (resizingTask && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const cellWidth = rect.width / 7;
      const x = e.clientX - rect.left;
      const dayIndex = Math.floor(x / cellWidth);

      if (dayIndex >= 0 && dayIndex < days.length && days[dayIndex]) {
        const newDate = days[dayIndex];

        setTasks(tasks.map(t => {
          if (t.id === resizingTask.task.id) {
            if (resizingTask.edge === 'left') {
              if (newDate <= t.endDate) {
                return { ...t, startDate: newDate };
              }
            } else {
              if (newDate >= t.startDate) {
                return { ...t, endDate: newDate };
              }
            }
          }
          return t;
        }));
      }
    }
  };

  const handleTaskMouseUp = () => {
    setDraggedTask(null);
    setResizingTask(null);
  };

  useEffect(() => {
    if (draggedTask || resizingTask) {
      window.addEventListener('mousemove', handleTaskDrag);
      window.addEventListener('mouseup', handleTaskMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleTaskDrag);
        window.removeEventListener('mouseup', handleTaskMouseUp);
      };
    }
  }, [draggedTask, resizingTask, tasks]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, dragSelection]);

  // Filter tasks
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Category filter
      if (!categoryFilters.has(task.category)) return false;

      // Search filter
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Time filter
      if (timeFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filterDate = new Date(today);
        filterDate.setDate(filterDate.getDate() + timeFilter * 7);

        if (task.startDate > filterDate) return false;
      }

      return true;
    });
  };

  const filteredTasks = getFilteredTasks();

  const toggleCategoryFilter = (category) => {
    const newFilters = new Set(categoryFilters);
    if (newFilters.has(category)) {
      newFilters.delete(category);
    } else {
      newFilters.add(category);
    }
    setCategoryFilters(newFilters);
  };

  const isDateSelected = (date) => {
    if (!date || !dragSelection.startDate || !dragSelection.endDate) return false;
    const start = dragSelection.startDate < dragSelection.endDate ? dragSelection.startDate : dragSelection.endDate;
    const end = dragSelection.startDate > dragSelection.endDate ? dragSelection.startDate : dragSelection.endDate;
    return isDateInRange(date, start, end);
  };

  const getTasksForDay = (date) => {
    if (!date) return [];
    return filteredTasks.filter(task => isDateInRange(date, task.startDate, task.endDate));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Sidebar - Filters */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-4 h-fit">
            <h3 className="font-semibold text-lg mb-4">Filters</h3>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Tasks</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              {['To Do', 'In Progress', 'Review', 'Completed'].map(cat => (
                <label key={cat} className="flex items-center mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFilters.has(cat)}
                    onChange={() => toggleCategoryFilter(cat)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{cat}</span>
                  <span className={`ml-auto w-3 h-3 rounded ${getCategoryColor(cat)}`}></span>
                </label>
              ))}
            </div>

            {/* Time Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              {[
                { label: 'All tasks', value: null },
                { label: 'Within 1 week', value: 1 },
                { label: 'Within 2 weeks', value: 2 },
                { label: 'Within 3 weeks', value: 3 }
              ].map(option => (
                <label key={option.label} className="flex items-center mb-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={timeFilter === option.value}
                    onChange={() => setTimeFilter(option.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{monthName}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>

            <div ref={calendarRef} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 bg-gray-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-b border-gray-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {days.map((date, idx) => {
                  const dayTasks = date ? getTasksForDay(date) : [];
                  const isSelected = isDateSelected(date);
                  const isToday = date && isSameDay(date, new Date());

                  return (
                    <div
                      key={idx}
                      className={`min-h-28 p-2 border-r border-b border-gray-200 last:border-r-0 relative ${!date ? 'bg-gray-50' : 'bg-white hover:bg-gray-50 cursor-pointer'
                        } ${isSelected ? 'bg-blue-100' : ''}`}
                      onMouseDown={(e) => handleMouseDown(date, e)}
                      onMouseEnter={() => handleMouseEnter(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayTasks.map(task => {
                              const isStart = isSameDay(task.startDate, date);
                              const isEnd = isSameDay(task.endDate, date);

                              return (
                                <div
                                  key={task.id}
                                  className={`task-bar ${getCategoryColor(task.category)} text-white text-xs px-2 py-1 rounded relative group cursor-move`}
                                  onMouseDown={(e) => handleTaskMouseDown(task, e)}
                                  title={task.name}
                                >
                                  {isStart && (
                                    <>
                                      <div
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                                        onMouseDown={(e) => handleTaskMouseDown(task, e, 'left')}
                                      />
                                      <span className="truncate block">{task.name}</span>
                                    </>
                                  )}
                                  {isEnd && (
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                                      onMouseDown={(e) => handleTaskMouseDown(task, e, 'right')}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>💡 <strong>Tip:</strong> Drag across days to create tasks. Drag tasks to move them. Drag task edges to resize.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Task</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              <p>Duration: {modalData.startDate.toLocaleDateString()} - {modalData.endDate.toLocaleDateString()}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createTask}
                disabled={!taskName.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md font-medium"
              >
                Create Task
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPlanner;